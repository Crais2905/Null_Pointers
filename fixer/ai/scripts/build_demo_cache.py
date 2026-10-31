"""Rebuild curated offline replay records. Does not call an LLM.
Run from ai/: python scripts/build_demo_cache.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import yaml
from app import main
from app.diagnose import Report, unknown
from app.llm import record
from app.schemas import AnalyzeRequest

ROOT = Path(__file__).resolve().parents[2]
AI = ROOT / 'ai'


def build():
    complaints = json.loads((ROOT / 'backend/src/main/resources/seed/complaints.json').read_text(encoding='utf-8'))
    catalog = yaml.safe_load((ROOT / 'backend/src/main/resources/seed/catalog.yml').read_text(encoding='utf-8'))[
        'modules']
    catalog = [{k: v for k, v in m.items() if k in {'id', 'name', 'description', 'keywords'}} for m in catalog]
    configs = {
        'DUP_CHARGE': ('PAYMENT_DUPLICATE', 'P1', .88, 'payments', ['java', 'payments', 'idempotency'], [4, 6],
                       'Повторний успішний запит оплати для одного замовлення.'),
        'DUP_CHARGE_AGAIN': ('PAYMENT_DUPLICATE', 'P1', .88, 'payments', ['java', 'payments', 'idempotency'], [4, 6],
                             'Повторний успішний запит оплати для одного замовлення.'),
        'PROMO_NPE': ('UNHANDLED_EXCEPTION', 'P2', .9, 'promo', ['java', 'spring'], [3, 4],
                      'NullPointerException у PromoService.apply під час застосування промокоду.'),
        'COURIER_TIMEOUT': ('UPSTREAM_TIMEOUT', 'P2', .8, 'courier-integration', ['network', 'timeouts'], [2, 5],
                            'Зовнішнє API кур’єрів не відповідає вчасно та повертає 503.'),
        'AMBIGUOUS': ('UNKNOWN', 'P3', .2, None, ['observability'], [],
                      'Недостатньо даних про причину повільної роботи.'),
    }
    requests = {}
    for name, (category, severity, confidence, module, skills, numbers, cause) in configs.items():
        complaint = complaints[name]
        request = dict(incident_id=1, user_message=complaint['userMessage'], order_id=complaint['orderId'],
                       user_id=complaint['userId'],
                       log_text=(AI / 'fixtures' / f'{name.lower()}.log').read_text(encoding='utf-8'),
                       module_catalog=catalog)
        requests[name] = request

        def capture(payload, raw):
            lines = raw.splitlines()
            report = unknown('Потрібні час скарги та логи з помилкою')
            d = report.diagnosis.model_dump()
            d.update(category=category, severity=severity, confidence=confidence, suspected_module_id=module,
                     required_skills=skills,
                     root_cause=cause, user_impact=complaint['userMessage'],
                     evidence=[dict(line=n, quote=lines[n - 1][:200], why='Підтвердження сигналу в логу') for n in
                               numbers],
                     repro_steps=['Повторити операцію з логу у тестовому середовищі'],
                     suggested_fix='Перевірити обробку цієї помилки в указаному модулі.',
                     unknowns=[] if numbers else ['Немає явної помилки'])
            criteria = ['Регресійний сценарій проходить', 'Помилку оброблено та зафіксовано в логу']
            title = f'[{module or "triage"}] {category}'
            body = '\n\n'.join(['## Контекст\n' + complaint['userMessage'], '## Що сталося\n' + cause,
                                '## Докази\n' + '\n'.join(f'Рядок {n}: ' + lines[n - 1][:200] for n in numbers),
                                '## Кроки відтворення\nПовторити операцію у тестовому середовищі',
                                '## Підозра\n' + str(module), '## Пропозиція виправлення\n' + d['suggested_fix'],
                                '## Критерії приймання\n' + '\n'.join(criteria)])
            output = Report.model_validate(
                dict(diagnosis=d, task_draft=dict(title=title, description_md=body, acceptance_criteria=criteria)))
            record(payload, Report.model_json_schema(), output.model_dump())

        prepared = main.prepare_analysis(AnalyzeRequest.model_validate(request))
        capture(prepared[6], prepared[0])
    # Also preserve the shared contract request as an independently keyed fixture.
    contract = json.loads((ROOT / 'contracts/ai-analyze-log.request.json').read_text(encoding='utf-8'))
    name = 'DUP_CHARGE';
    category, severity, confidence, module, skills, numbers, cause = configs[name];
    complaint = complaints[name]
    prepared = main.prepare_analysis(AnalyzeRequest.model_validate(contract))
    capture(prepared[6], prepared[0])
    (AI / 'fixtures/demo_requests.json').write_text(json.dumps(requests, ensure_ascii=False, indent=2) + '\n',
                                                    encoding='utf-8')


if __name__ == '__main__': build()
