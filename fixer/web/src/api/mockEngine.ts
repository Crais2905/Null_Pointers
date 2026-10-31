import summariesSeed from './mocks/api-incident-list.json';
import incidentSeed from './mocks/incident.mock.json';
import developersSeed from './mocks/api-developers.json';
import taskSeed from './mocks/api-task.json';
import type {
  AcceptedIncidentResponse,
  Candidate,
  CreateIncidentRequest,
  Developer,
  DevTask,
  Incident,
  IncidentSummary,
  Metrics,
  ModuleCatalogItem,
  Scenario,
  Settings,
  Severity,
} from './types';

const MODULE_CATALOG_MOCK: ModuleCatalogItem[] = [
  {
    id: 'payments',
    name: 'Платежі',
    description: 'PaymentController і шлюз оплати',
    keywords: ['pay', 'charge', 'refund', 'gateway', 'idempotency'],
  },
  {
    id: 'orders',
    name: 'Замовлення',
    description: 'Статуси й життєвий цикл замовлень',
    keywords: ['order', 'status', 'processing'],
  },
  {
    id: 'promo',
    name: 'Промокоди',
    description: 'PromoService, застосування знижок',
    keywords: ['promo', 'discount', 'coupon'],
  },
  {
    id: 'courier-integration',
    name: "Інтеграція з кур'єрами",
    description: "Зовнішнє API кур'єрської служби",
    keywords: ['courier', 'dispatch', 'timeout'],
  },
  {
    id: 'web-checkout',
    name: 'Оформлення замовлення (фронт)',
    description: 'Екран оформлення й оплати',
    keywords: ['checkout', 'button', 'ui'],
  },
];

const DEMO_LOGS: Record<Scenario, string> = {
  DUP_CHARGE: incidentSeed.rawLog,
  DUP_CHARGE_AGAIN:
    '2026-10-31T13:10:11.001Z INFO  [api-gateway] trace=t200 request_id=c3 POST /api/pay order=402 user=91\n' +
    '2026-10-31T13:10:11.250Z INFO  [payment-service] trace=t200 request_id=c3 POST /api/pay order=402 -> 200 charged tx=TX-7 amount=340\n' +
    '2026-10-31T13:10:12.150Z INFO  [api-gateway] trace=t201 request_id=d9 POST /api/pay order=402 user=91\n' +
    '2026-10-31T13:10:12.420Z INFO  [payment-service] trace=t201 request_id=d9 POST /api/pay order=402 -> 200 charged tx=TX-8 amount=340\n' +
    '2026-10-31T13:10:12.425Z WARN  [payment-service] trace=t201 order=402 header X-Idempotency-Key missing\n' +
    Array.from({ length: 55 }, (_, i) => `2026-10-31T12:40:${String(i + 5).padStart(2, '0')}.000Z INFO [health-service] healthcheck ok`).join('\n'),
  PROMO_NPE:
    '2026-10-31T14:02:10.100Z INFO  [promo-service] trace=t300 order=455 user=12 apply promo code=WELCOME10\n' +
    '2026-10-31T14:02:10.130Z ERROR [promo-service] trace=t300 Unhandled exception while applying promo\n' +
    'java.lang.NullPointerException: Cannot invoke "Promo.getValidFrom()" because "promo" is null\n' +
    '\tat com.yummi.promo.PromoService.apply(PromoService.java:88)\n' +
    '\tat com.yummi.promo.PromoController.apply(PromoController.java:41)\n' +
    '\tat jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)\n' +
    '2026-10-31T14:02:40.200Z INFO  [promo-service] trace=t301 order=460 user=14 apply promo code=WELCOME10\n' +
    '2026-10-31T14:02:40.220Z ERROR [promo-service] trace=t301 Unhandled exception while applying promo\n' +
    'java.lang.NullPointerException: Cannot invoke "Promo.getValidFrom()" because "promo" is null\n' +
    '\tat com.yummi.promo.PromoService.apply(PromoService.java:88)\n' +
    '\tat com.yummi.promo.PromoController.apply(PromoController.java:41)\n' +
    '2026-10-31T14:03:12.400Z INFO  [promo-service] trace=t302 order=463 user=19 apply promo code=WELCOME10\n' +
    '2026-10-31T14:03:12.415Z ERROR [promo-service] trace=t302 Unhandled exception while applying promo\n' +
    'java.lang.NullPointerException: Cannot invoke "Promo.getValidFrom()" because "promo" is null\n' +
    '\tat com.yummi.promo.PromoService.apply(PromoService.java:88)\n' +
    Array.from({ length: 45 }, (_, i) => `2026-10-31T12:40:${String(i + 15).padStart(2, '0')}.000Z INFO [health-service] healthcheck ok`).join('\n'),
  COURIER_TIMEOUT:
    '2026-10-31T15:20:01.000Z INFO  [order-service] trace=t400 order=501 status=PROCESSING requesting courier\n' +
    '2026-10-31T15:20:06.010Z WARN  [courier-client] trace=t400 order=501 connect timeout to courier-api.partner.example attempt=1\n' +
    '2026-10-31T15:20:16.020Z WARN  [courier-client] trace=t400 order=501 connect timeout to courier-api.partner.example attempt=2\n' +
    '2026-10-31T15:20:36.030Z WARN  [courier-client] trace=t400 order=501 connect timeout to courier-api.partner.example attempt=3\n' +
    '2026-10-31T15:21:16.040Z ERROR [courier-client] trace=t400 order=501 courier-api.partner.example returned 503 after 3 retries\n' +
    '2026-10-31T15:21:16.050Z ERROR [order-service] trace=t400 order=501 courier not assigned, stays PROCESSING\n' +
    '2026-10-31T15:24:01.000Z ERROR [courier-client] trace=t405 order=507 courier-api.partner.example returned 503\n' +
    Array.from({ length: 53 }, (_, i) => `2026-10-31T12:40:${String(i + 7).padStart(2, '0')}.000Z INFO [health-service] healthcheck ok`).join('\n'),
  AMBIGUOUS:
    '2026-10-31T16:00:01.100Z INFO  [api-gateway] trace=t500 GET /api/menu -> 200 (1420ms)\n' +
    '2026-10-31T16:00:05.200Z WARN  [api-gateway] trace=t501 GET /api/orders -> 200 (2210ms) slow response\n' +
    '2026-10-31T16:00:09.300Z INFO  [api-gateway] trace=t502 GET /api/menu -> 200 (980ms)\n' +
    '2026-10-31T16:00:14.400Z WARN  [api-gateway] trace=t503 GET /api/orders -> 200 (1890ms) slow response\n' +
    '2026-10-31T16:00:20.500Z INFO  [api-gateway] trace=t504 GET /api/profile -> 200 (1100ms)\n' +
    Array.from({ length: 55 }, (_, i) => `2026-10-31T12:40:${String(i + 5).padStart(2, '0')}.000Z INFO [health-service] healthcheck ok`).join('\n'),
};

interface MockState {
  nextIncidentId: number;
  nextTaskId: number;
  settings: Settings;
  developers: Developer[];
  modules: ModuleCatalogItem[];
  incidents: Record<number, Incident>;
  incidentOrder: number[];
  tasks: Record<number, DevTask>;
  fingerprintToTaskId: Record<string, number>;
  incidentFingerprints: Record<number, string>;
  incidentTaskDrafts: Record<
    number,
    { title: string; bodyMd: string; priority: Severity; signature: string }
  >;
}

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function createInitialState(): MockState {
  const initialIncident: Incident = JSON.parse(JSON.stringify(incidentSeed));
  const initialTask: DevTask = JSON.parse(JSON.stringify(taskSeed));
  initialTask.bodyMd =
    `## Контекст\nІнцидент [#12](/?incidentId=12) · Скарги на подвійне списання замовлення #318\n\n` +
    `## Що сталося\nPaymentController приймає повторний \`POST /api/pay\` без перевірки ключа ідемпотентності \`X-Idempotency-Key\`.\n\n` +
    `## Докази з логу\n- Рядок 4: \`trace=t101 request_id=a1 POST /api/pay order=318 -> 200 charged tx=TX-1 amount=289\`\n` +
    `- Рядок 6: \`trace=t102 request_id=b7 POST /api/pay order=318 -> 200 charged tx=TX-2 amount=289\`\n\n` +
    `## Кроки відтворення\n1. Надіслати два POST /api/pay для одного order_id з інтервалом < 1 с.\n2. Перевірити транзакції в шлюзі оплати.\n\n` +
    `## Пропозиція виправлення\nДодати обов'язкову перевірку \`X-Idempotency-Key\` та унікальний індекс у таблиці платежів.\n\n` +
    `## Критерії приймання\n- [ ] Повторний POST з тим самим ключем повертає перший результат і не створює другого платежу\n` +
    `- [ ] Два одночасні запити з одним ключем створюють лише один платіж\n\n` +
    `---\n**Виконавець:** Андрій Коваль (\`dev-1\`) · **Backup:** Марія Шевчук (\`dev-2\`) · **Повторень:** 1`;
  initialIncident.task = initialTask;

  return {
    nextIncidentId: 13,
    nextTaskId: 32,
    settings: { autoDispatch: true },
    developers: JSON.parse(JSON.stringify(developersSeed)),
    modules: JSON.parse(JSON.stringify(MODULE_CATALOG_MOCK)),
    incidents: { [initialIncident.id]: initialIncident },
    incidentOrder: [initialIncident.id],
    tasks: { [initialTask.id]: initialTask },
    fingerprintToTaskId: { 'fp-dup-pay': initialTask.id },
    incidentFingerprints: { [initialIncident.id]: 'fp-dup-pay' },
    incidentTaskDrafts: {
      [initialIncident.id]: {
        title: initialTask.title,
        bodyMd: initialTask.bodyMd,
        priority: initialTask.priority,
        signature: 'dup_request POST /api/pay',
      },
    },
  };
}

let state: MockState = createInitialState();

function scoreCandidates(
  suspectedModuleId: string | null,
  requiredSkills: string[],
  severity: Severity
): Candidate[] {
  const openTasksByDev: Record<string, number> = {};
  Object.values(state.tasks).forEach((t) => {
    if (t.status !== 'DONE') {
      openTasksByDev[t.assigneeId] = (openTasksByDev[t.assigneeId] ?? 0) + 1;
    }
  });

  const ranked = state.developers
    .filter((d) => d.available)
    .map((dev) => {
      let score = 0;
      const reasons: string[] = [];

      if (suspectedModuleId) {
        const ownership = dev.ownedModules.find((m) => m.id === suspectedModuleId);
        if (ownership) {
          const bonus = ownership.level === 'primary' ? 60 : 50;
          score += bonus;
          reasons.push(`власник модуля ${suspectedModuleId} (${ownership.level})`);
        }
      }

      const matchedSkills = dev.skills.filter((s) => requiredSkills.includes(s));
      if (matchedSkills.length > 0) {
        const skillPoints = Math.min(30, matchedSkills.length * 10);
        score += skillPoints;
        reasons.push(`навички: ${matchedSkills.join(', ')}`);
      }

      const openCount = openTasksByDev[dev.id] ?? 0;
      if (severity !== 'P1' && openCount > 0) {
        const penalty = Math.min(15, openCount * 5);
        score -= penalty;
      }
      reasons.push(`відкритих завдань: ${openCount}`);

      return {
        developerId: dev.id,
        name: dev.name,
        score,
        reasons,
        openCount,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.openCount !== b.openCount) return a.openCount - b.openCount;
      return a.developerId.localeCompare(b.developerId);
    });

  return ranked.slice(0, 3).map(({ developerId, name, score, reasons }) => ({
    developerId,
    name,
    score,
    reasons,
  }));
}

function buildTaskBody(params: {
  incidentId: number;
  userMessage: string;
  rootCause: string;
  suspectedModuleId: string | null;
  evidence: { line: number; quote: string; why: string }[];
  reproSteps: string[];
  suggestedFix: string;
  acceptanceCriteria: string[];
  assigneeName: string;
  assigneeId: string;
  backupName?: string;
  backupId?: string;
  occurrences: number;
}): string {
  const evLines =
    params.evidence.length > 0
      ? params.evidence.map((e) => `- **Рядок ${e.line}**: \`${e.quote}\` — *${e.why}*`).join('\n')
      : '- Докази не підтверджені автоматично (ручний тріаж)';
  const repro =
    params.reproSteps.length > 0
      ? params.reproSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
      : '1. Див. сирий лог інциденту';
  const criteria =
    params.acceptanceCriteria.length > 0
      ? params.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n')
      : '- [ ] Проблему усунуто та покрито тестом';

  return (
    `## Контекст\n` +
    `Інцидент [#${params.incidentId}](/?incidentId=${params.incidentId}) · Скарга: "${params.userMessage}"\n\n` +
    `## Що сталося\n` +
    `${params.rootCause}\n\n` +
    `## Підозрюваний модуль\n` +
    `\`${params.suspectedModuleId ?? 'unknown'}\`\n\n` +
    `## Докази з логу\n` +
    `${evLines}\n\n` +
    `## Кроки відтворення\n` +
    `${repro}\n\n` +
    `## Пропозиція виправлення\n` +
    `${params.suggestedFix}\n\n` +
    `## Критерії приймання\n` +
    `${criteria}\n\n` +
    `---\n` +
    `**Виконавець:** ${params.assigneeName} (\`${params.assigneeId}\`)` +
    (params.backupId ? ` · **Backup:** ${params.backupName} (\`${params.backupId}\`)` : '') +
    ` · **Повторень:** ${params.occurrences}`
  );
}

function scheduleMockPipeline(incidentId: number, scenario: Scenario) {
  // Крок 1: за 650мс переходимо в ANALYZING
  setTimeout(() => {
    const inc = state.incidents[incidentId];
    if (!inc || inc.status === 'DISMISSED') return;
    inc.status = 'ANALYZING';
    inc.stages = [
      { name: 'PARSE', status: 'DONE', ms: 34 },
      { name: 'DETECT', status: 'DONE', ms: 14 },
      { name: 'DIAGNOSE', status: 'IN_PROGRESS' },
      { name: 'VERIFY_EVIDENCE', status: 'PENDING' },
      { name: 'ROUTE', status: 'PENDING' },
      { name: 'DISPATCH', status: 'PENDING' },
    ];
    inc.auditLog.push({
      ts: nowTimeStr(),
      actor: 'SYSTEM',
      event: 'Запущено аналіз логу та детектори D1–D7 (маскування PII виконано)',
    });
  }, 550);

  // Крок 2: за 1400мс переходимо в DIAGNOSED та фіналізуємо за правилами R1-R6
  setTimeout(() => {
    const inc = state.incidents[incidentId];
    if (!inc || inc.status === 'DISMISSED') return;

    const auto = state.settings.autoDispatch;

    if (scenario === 'DUP_CHARGE' || scenario === 'DUP_CHARGE_AGAIN') {
      const isSecond = scenario === 'DUP_CHARGE_AGAIN';
      const line1 = isSecond ? 2 : 4;
      const line2 = isSecond ? 4 : 6;
      const orderNum = isSecond ? 402 : 318;
      const tx1 = isSecond ? 'TX-7' : 'TX-1';
      const tx2 = isSecond ? 'TX-8' : 'TX-2';
      const req1 = isSecond ? 'c3' : 'a1';
      const req2 = isSecond ? 'd9' : 'b7';
      const tr1 = isSecond ? 't200' : 't101';
      const tr2 = isSecond ? 't201' : 't102';
      const amt = isSecond ? 340 : 289;

      inc.findings = [
        {
          detector: 'D1',
          line_numbers: [line1, line2],
          excerpt: `POST /api/pay order=${orderNum} -> 200`,
          note: 'два успішні POST за 0.9 с, різні request_id',
        },
      ];
      inc.diagnosis = {
        category: 'PAYMENT_DUPLICATE',
        severity: 'P1',
        rootCause: 'PaymentController приймає повторний POST /api/pay без ключа ідемпотентності',
        suspectedModuleId: 'payments',
        userImpact: `Подвійне списання коштів у клієнта (замовлення #${orderNum})`,
        requiredSkills: ['java', 'payments', 'idempotency'],
        reproSteps: [
          `Двічі швидко надіслати POST /api/pay для замовлення #${orderNum} без заголовка X-Idempotency-Key`,
        ],
        suggestedFix: 'Додати перевірку X-Idempotency-Key у PaymentController та UNIQUE індекс у таблиці транзакцій',
        evidence: [
          {
            line: line1,
            quote: `trace=${tr1} request_id=${req1} POST /api/pay order=${orderNum} -> 200 charged tx=${tx1} amount=${amt}`,
            why: 'перше успішне списання за замовленням',
            verified: true,
          },
          {
            line: line2,
            quote: `trace=${tr2} request_id=${req2} POST /api/pay order=${orderNum} -> 200 charged tx=${tx2} amount=${amt}`,
            why: 'друге успішне списання через 0.9 с з іншим request_id',
            verified: true,
          },
        ],
      };
      inc.llmConfidence = 0.88;
      inc.finalConfidence = 0.88;
      inc.candidates = scoreCandidates('payments', ['java', 'payments', 'idempotency'], 'P1');
      inc.pipelineSeconds = 6.3;

      const fp = 'fp-dup-pay';
      state.incidentFingerprints[incidentId] = fp;
      const top = inc.candidates[0];
      const backup = inc.candidates[1];
      const title = '[payments] Захистити POST /api/pay від повторного списання';
      const bodyMd = buildTaskBody({
        incidentId,
        userMessage: inc.userMessage,
        rootCause: inc.diagnosis.rootCause,
        suspectedModuleId: 'payments',
        evidence: inc.diagnosis.evidence,
        reproSteps: inc.diagnosis.reproSteps ?? [],
        suggestedFix: inc.diagnosis.suggestedFix ?? '',
        acceptanceCriteria: [
          'Повторний POST з тим самим ключем повертає перший результат і не створює другого платежу',
          'Два одночасні запити з одним ключем створюють один платіж',
        ],
        assigneeName: top?.name ?? 'Андрій Коваль',
        assigneeId: top?.developerId ?? 'dev-1',
        backupName: backup?.name,
        backupId: backup?.developerId,
        occurrences: 1,
      });

      state.incidentTaskDrafts[incidentId] = {
        title,
        bodyMd,
        priority: 'P1',
        signature: 'dup_request POST /api/pay',
      };

      inc.auditLog.push({
        ts: nowTimeStr(),
        actor: 'AI',
        event: 'Діагноз PAYMENT_DUPLICATE · P1 · впевненість 0.88 (2/2 доказів верифіковано)',
      });

      const existingTaskId = state.fingerprintToTaskId[fp];
      const existingTask = existingTaskId ? state.tasks[existingTaskId] : undefined;

      if (existingTask && existingTask.status !== 'DONE') {
        existingTask.occurrences += 1;
        inc.status = 'DEDUPLICATED';
        inc.dedupOf = existingTask.incidentId ?? 12;
        inc.task = existingTask;
        inc.decision = {
          outcome: 'DEDUPLICATED',
          rule: 'R2',
          reason: `Знайдено відкрите завдання #${existingTask.id} з тим самим fingerprint (dup_request POST /api/pay). Повторень: ${existingTask.occurrences}`,
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 34 },
          { name: 'DETECT', status: 'DONE', ms: 12 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5800 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 5 },
          { name: 'ROUTE', status: 'DONE', ms: 8 },
          { name: 'DISPATCH', status: 'DONE', ms: 11 },
        ];
        inc.auditLog.push({
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: `Дедупліковано (R2): приєднано до завдання #${existingTask.id}, лічильник повторень = ${existingTask.occurrences}`,
        });
      } else if (auto) {
        const newTask: DevTask = {
          id: state.nextTaskId++,
          incidentId,
          title,
          priority: 'P1',
          assigneeId: top?.developerId ?? 'dev-1',
          backupId: backup?.developerId ?? 'dev-2',
          occurrences: 1,
          bodyMd,
          deliveryStatus: 'IN_APP',
          status: 'OPEN',
        };
        state.tasks[newTask.id] = newTask;
        state.fingerprintToTaskId[fp] = newTask.id;
        inc.status = 'AUTO_DISPATCHED';
        inc.task = newTask;
        inc.decision = {
          outcome: 'AUTO_DISPATCHED',
          rule: 'R5',
          reason: 'впевненість 0.88 ≥ 0.75, autoDispatch увімкнено',
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 34 },
          { name: 'DETECT', status: 'DONE', ms: 12 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5900 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 6 },
          { name: 'ROUTE', status: 'DONE', ms: 9 },
          { name: 'DISPATCH', status: 'DONE', ms: 15 },
        ];
        inc.auditLog.push({
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: `Авто-відправлено (R5) → ${top?.name ?? 'Андрій Коваль'} (завдання #${newTask.id})`,
        });
      } else {
        inc.status = 'PENDING_CONFIRM';
        inc.decision = {
          outcome: 'PENDING_CONFIRM',
          rule: 'R6',
          reason: 'впевненість 0.88 ≥ 0.75, але тумблер autoDispatch вимкнений',
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 34 },
          { name: 'DETECT', status: 'DONE', ms: 12 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5900 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 6 },
          { name: 'ROUTE', status: 'DONE', ms: 9 },
          { name: 'DISPATCH', status: 'WAITING' },
        ];
        inc.auditLog.push({
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: 'Очікує підтвердження людини (R6: autoDispatch вимкнений)',
        });
      }
      return;
    }

    if (scenario === 'PROMO_NPE') {
      inc.findings = [
        {
          detector: 'D5',
          line_numbers: [2, 3, 4],
          excerpt: 'java.lang.NullPointerException at PromoService.apply(PromoService.java:88)',
          note: 'NullPointerException у PromoService.apply, 3 повтори у вікні',
        },
        {
          detector: 'D2',
          line_numbers: [2, 8, 13],
          excerpt: 'ERROR [promo-service] Unhandled exception while applying promo',
          note: 'серія помилок ERROR у promo-service',
        },
      ];
      inc.diagnosis = {
        category: 'UNHANDLED_EXCEPTION',
        severity: 'P2',
        rootCause:
          'PromoService.apply викликає promo.getValidFrom() без перевірки на null, коли промокод відсутній або неактивний у кеші',
        suspectedModuleId: 'promo',
        userImpact: 'Користувачі не можуть застосувати промокод WELCOME10 при оформленні замовлення',
        requiredSkills: ['java', 'spring', 'caching'],
        reproSteps: [
          'Ввести промокод WELCOME10 на екрані оформлення замовлення',
          'Отримати 500 Internal Server Error від promo-service',
        ],
        suggestedFix:
          'Перевіряти результат promoRepository.findByCode(code) на null і кидати контрольований PromoNotFoundException (404/422) замість NPE',
        evidence: [
          {
            line: 3,
            quote: 'java.lang.NullPointerException: Cannot invoke "Promo.getValidFrom()" because "promo" is null',
            why: 'пряма вказівка на причину падіння через null-референс promo',
            verified: true,
          },
          {
            line: 4,
            quote: 'at com.yummi.promo.PromoService.apply(PromoService.java:88)',
            why: 'точне місце виникнення помилки у коді модуля promo',
            verified: true,
          },
        ],
      };
      inc.llmConfidence = 0.92;
      inc.finalConfidence = 0.92;
      inc.candidates = scoreCandidates('promo', ['java', 'spring', 'caching'], 'P2');
      inc.pipelineSeconds = 5.8;

      const fp = 'fp-promo-npe';
      state.incidentFingerprints[incidentId] = fp;
      const top = inc.candidates[0];
      const backup = inc.candidates[1];
      const title = '[promo] Усунути NullPointerException у PromoService.apply:88';
      const bodyMd = buildTaskBody({
        incidentId,
        userMessage: inc.userMessage,
        rootCause: inc.diagnosis.rootCause,
        suspectedModuleId: 'promo',
        evidence: inc.diagnosis.evidence,
        reproSteps: inc.diagnosis.reproSteps ?? [],
        suggestedFix: inc.diagnosis.suggestedFix ?? '',
        acceptanceCriteria: [
          'PromoService.apply обробляє null без NullPointerException і повертає зрозумілий код клієнту',
          'Додано unit-тест для неіснуючого та протермінованого промокоду',
        ],
        assigneeName: top?.name ?? 'Марія Шевчук',
        assigneeId: top?.developerId ?? 'dev-2',
        backupName: backup?.name,
        backupId: backup?.developerId,
        occurrences: 1,
      });

      state.incidentTaskDrafts[incidentId] = {
        title,
        bodyMd,
        priority: 'P2',
        signature: 'NullPointerException PromoService.apply',
      };

      inc.auditLog.push({
        ts: nowTimeStr(),
        actor: 'AI',
        event: 'Діагноз UNHANDLED_EXCEPTION · P2 · впевненість 0.92 (2/2 доказів верифіковано)',
      });

      const existingTaskId = state.fingerprintToTaskId[fp];
      const existingTask = existingTaskId ? state.tasks[existingTaskId] : undefined;

      if (existingTask && existingTask.status !== 'DONE') {
        existingTask.occurrences += 1;
        inc.status = 'DEDUPLICATED';
        inc.dedupOf = existingTask.incidentId ?? incidentId;
        inc.task = existingTask;
        inc.decision = {
          outcome: 'DEDUPLICATED',
          rule: 'R2',
          reason: `Об'єднано з відкритим завданням #${existingTask.id} (повторень: ${existingTask.occurrences})`,
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 29 },
          { name: 'DETECT', status: 'DONE', ms: 15 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5400 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 4 },
          { name: 'ROUTE', status: 'DONE', ms: 7 },
          { name: 'DISPATCH', status: 'DONE', ms: 10 },
        ];
      } else if (auto) {
        const newTask: DevTask = {
          id: state.nextTaskId++,
          incidentId,
          title,
          priority: 'P2',
          assigneeId: top?.developerId ?? 'dev-2',
          backupId: backup?.developerId ?? 'dev-1',
          occurrences: 1,
          bodyMd,
          deliveryStatus: 'IN_APP',
          status: 'OPEN',
        };
        state.tasks[newTask.id] = newTask;
        state.fingerprintToTaskId[fp] = newTask.id;
        inc.status = 'AUTO_DISPATCHED';
        inc.task = newTask;
        inc.decision = {
          outcome: 'AUTO_DISPATCHED',
          rule: 'R5',
          reason: 'впевненість 0.92 ≥ 0.75, autoDispatch увімкнено',
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 29 },
          { name: 'DETECT', status: 'DONE', ms: 15 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5400 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 4 },
          { name: 'ROUTE', status: 'DONE', ms: 7 },
          { name: 'DISPATCH', status: 'DONE', ms: 14 },
        ];
        inc.auditLog.push({
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: `Авто-відправлено (R5) → ${top?.name ?? 'Марія Шевчук'} (завдання #${newTask.id})`,
        });
      } else {
        inc.status = 'PENDING_CONFIRM';
        inc.decision = {
          outcome: 'PENDING_CONFIRM',
          rule: 'R6',
          reason: 'впевненість 0.92 ≥ 0.75, але тумблер autoDispatch вимкнений',
        };
        inc.stages = [
          { name: 'PARSE', status: 'DONE', ms: 29 },
          { name: 'DETECT', status: 'DONE', ms: 15 },
          { name: 'DIAGNOSE', status: 'DONE', ms: 5400 },
          { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 4 },
          { name: 'ROUTE', status: 'DONE', ms: 7 },
          { name: 'DISPATCH', status: 'WAITING' },
        ];
      }
      return;
    }

    if (scenario === 'COURIER_TIMEOUT') {
      inc.findings = [
        {
          detector: 'D3',
          line_numbers: [2, 3, 4],
          excerpt: 'connect timeout to courier-api.partner.example attempt=1..3',
          note: '3 послідовні ретраї підключення до зовнішнього сервісу',
        },
        {
          detector: 'D4',
          line_numbers: [5, 7],
          excerpt: 'courier-api.partner.example returned 503 after 3 retries',
          note: 'зовнішній сервіс courier-api.partner.example повертає 503',
        },
      ];
      inc.diagnosis = {
        category: 'UPSTREAM_TIMEOUT',
        severity: 'P2',
        rootCause:
          "Зовнішній сервіс courier-api.partner.example не відповідає вчасно (connect timeout) і повертає 503 після 3 ретраїв, через що замовлення лишається в статусі PROCESSING",
        suspectedModuleId: 'courier-integration',
        userImpact: "Замовлення #501 застрягло в PROCESSING без призначеного кур'єра",
        requiredSkills: ['devops', 'network', 'timeouts', 'observability'],
        reproSteps: [
          'Створити замовлення #501 і перевести в статус PROCESSING',
          'Спостерігати 3 таймаути до courier-api.partner.example та відсутність fallback-черги',
        ],
        suggestedFix:
          'Налаштувати Circuit Breaker + відкладену чергу повторного призначення (outbox/retry worker), перевірити мережевий маршрут до партнера',
        evidence: [
          {
            line: 5,
            quote: 'ERROR [courier-client] trace=t400 order=501 courier-api.partner.example returned 503 after 3 retries',
            why: 'підтверджує відмову зовнішнього API після вичерпання ретраїв',
            verified: true,
          },
          {
            line: 6,
            quote: 'ERROR [order-service] trace=t400 order=501 courier not assigned, stays PROCESSING',
            why: 'показує зависання замовлення без компенсаційної дії',
            verified: true,
          },
        ],
      };
      inc.llmConfidence = 0.68;
      inc.finalConfidence = 0.68;
      inc.candidates = scoreCandidates(
        'courier-integration',
        ['devops', 'network', 'timeouts', 'observability'],
        'P2'
      );
      inc.pipelineSeconds = 6.9;

      const fp = 'fp-courier-timeout';
      state.incidentFingerprints[incidentId] = fp;
      const top = inc.candidates[0];
      const backup = inc.candidates[1];
      const title = "[courier-integration] Таймаут і 503 від courier-api: замовлення зависає в PROCESSING";
      const bodyMd = buildTaskBody({
        incidentId,
        userMessage: inc.userMessage,
        rootCause: inc.diagnosis.rootCause,
        suspectedModuleId: 'courier-integration',
        evidence: inc.diagnosis.evidence,
        reproSteps: inc.diagnosis.reproSteps ?? [],
        suggestedFix: inc.diagnosis.suggestedFix ?? '',
        acceptanceCriteria: [
          'При 503/timeout від courier-api замовлення ставиться у фонову чергу повтору, а не зависає назавжди',
          'Додано алерт на перевищення порогу помилок інтеграції',
        ],
        assigneeName: top?.name ?? 'Олена Мельник',
        assigneeId: top?.developerId ?? 'dev-4',
        backupName: backup?.name,
        backupId: backup?.developerId,
        occurrences: 1,
      });

      state.incidentTaskDrafts[incidentId] = {
        title,
        bodyMd,
        priority: 'P2',
        signature: 'upstream_failure courier-api.partner.example 503',
      };

      inc.status = 'PENDING_CONFIRM';
      inc.decision = {
        outcome: 'PENDING_CONFIRM',
        rule: 'R4',
        reason: 'впевненість 0.68 у діапазоні [0.50, 0.75) — потрібне підтвердження людини перед відправкою',
      };
      inc.stages = [
        { name: 'PARSE', status: 'DONE', ms: 38 },
        { name: 'DETECT', status: 'DONE', ms: 16 },
        { name: 'DIAGNOSE', status: 'DONE', ms: 6400 },
        { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 5 },
        { name: 'ROUTE', status: 'DONE', ms: 8 },
        { name: 'DISPATCH', status: 'WAITING' },
      ];
      inc.auditLog.push(
        {
          ts: nowTimeStr(),
          actor: 'AI',
          event: 'Діагноз UPSTREAM_TIMEOUT · P2 · впевненість 0.68',
        },
        {
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: 'Політика R4: завдання підготовлено для Олени Мельник, очікує підтвердження оператора',
        }
      );
      return;
    }

    // AMBIGUOUS або кастомний невідомий лог
    inc.findings = [];
    inc.diagnosis = {
      category: 'UNKNOWN',
      severity: 'P3',
      rootCause:
        'У логу зафіксовано лише поодинокі повільні відповіді (WARN slow response 1.8–2.2 с) без явних помилок, винятків чи відмов сервісів',
      suspectedModuleId: null,
      userImpact: 'Користувач скаржиться на повільну роботу додатку, але точна причина в логах не локалізована',
      requiredSkills: ['observability'],
      unknowns: [
        'Відсутні метрики БД та профілювання запитів GET /api/orders',
        'Немає ERROR або стек-трейсів для побудови доказового діагнозу',
      ],
      evidence: [
        {
          line: 2,
          quote: 'WARN  [api-gateway] trace=t501 GET /api/orders -> 200 (2210ms) slow response',
          why: 'підтверджує затримку 2.2 с, але не вказує на конкретний зламаний модуль',
          verified: true,
        },
      ],
    };
    inc.llmConfidence = 0.34;
    inc.finalConfidence = 0.34;
    inc.candidates = scoreCandidates(null, ['observability'], 'P3');
    inc.pipelineSeconds = 4.9;

    const fp = `manual_incident:${incidentId}`;
    state.incidentFingerprints[incidentId] = fp;
    const title = `[triage] Дослідити повільні відповіді GET /api/orders (інцидент #${incidentId})`;
    const bodyMd = buildTaskBody({
      incidentId,
      userMessage: inc.userMessage,
      rootCause: `${inc.diagnosis.rootCause} (Діагноз непідтверджений автоматично — призначено вручну з черги тріажу)`,
      suspectedModuleId: null,
      evidence: inc.diagnosis.evidence,
      reproSteps: ['Перевірити APM-трейси t501 та t503 для GET /api/orders'],
      suggestedFix: 'Перевірити індекси БД та час відповіді downstream-сервісів під час пікового навантаження',
      acceptanceCriteria: ['Визначено причину затримок > 2 с у GET /api/orders'],
      assigneeName: 'Призначено вручну',
      assigneeId: 'manual',
      occurrences: 1,
    });

    state.incidentTaskDrafts[incidentId] = {
      title,
      bodyMd,
      priority: 'P3',
      signature: fp,
    };

    inc.status = 'NEEDS_TRIAGE';
    inc.decision = {
      outcome: 'NEEDS_TRIAGE',
      rule: 'R1',
      reason: 'category = UNKNOWN та finalConfidence 0.34 < 0.50 — завдання не вигадуємо, передано на ручний тріаж',
    };
    inc.stages = [
      { name: 'PARSE', status: 'DONE', ms: 31 },
      { name: 'DETECT', status: 'DONE', ms: 10 },
      { name: 'DIAGNOSE', status: 'DONE', ms: 4600 },
      { name: 'VERIFY_EVIDENCE', status: 'DONE', ms: 4 },
      { name: 'ROUTE', status: 'DONE', ms: 6 },
      { name: 'DISPATCH', status: 'SKIPPED' },
    ];
    inc.auditLog.push(
      {
        ts: nowTimeStr(),
        actor: 'AI',
        event: 'Діагноз UNKNOWN · впевненість 0.34 (недостатньо даних для точного висновку)',
      },
      {
        ts: nowTimeStr(),
        actor: 'SYSTEM',
        event: 'Переведено в NEEDS_TRIAGE за правилом R1: потрібне рішення інженера',
      }
    );
  }, 1350);
}

function detectScenarioFromLog(log: string, userMessage: string): Scenario {
  const combined = `${log}\n${userMessage}`.toLowerCase();
  if (combined.includes('order=402') || combined.includes('tx-7')) return 'DUP_CHARGE_AGAIN';
  if (combined.includes('/api/pay') || combined.includes('idempotency')) return 'DUP_CHARGE';
  if (combined.includes('nullpointerexception') || combined.includes('promoservice')) return 'PROMO_NPE';
  if (combined.includes('courier-api') || combined.includes('connect timeout')) return 'COURIER_TIMEOUT';
  return 'AMBIGUOUS';
}

const COMPLAINTS_BY_SCENARIO: Record<
  Scenario,
  { userMessage: string; orderId: number | null; userId: number }
> = {
  DUP_CHARGE: {
    userMessage: 'Мене списали двічі за замовлення 318, поверніть гроші',
    orderId: 318,
    userId: 77,
  },
  DUP_CHARGE_AGAIN: {
    userMessage: 'З картки зняли гроші двічі за замовлення 402',
    orderId: 402,
    userId: 91,
  },
  PROMO_NPE: {
    userMessage: 'Промокод WELCOME10 не застосовується, пише помилку',
    orderId: 455,
    userId: 12,
  },
  COURIER_TIMEOUT: {
    userMessage: "Замовлення 501 висить більше години, кур'єра немає",
    orderId: 501,
    userId: 33,
  },
  AMBIGUOUS: {
    userMessage: 'Додаток працює повільно',
    orderId: null,
    userId: 58,
  },
};

export const mockEngine = {
  getSampleLog(scenario: Scenario): {
    userMessage: string;
    log: string;
    orderId: number | null;
    userId: number;
  } {
    const meta = COMPLAINTS_BY_SCENARIO[scenario];
    return {
      userMessage: meta.userMessage,
      log: DEMO_LOGS[scenario],
      orderId: meta.orderId,
      userId: meta.userId,
    };
  },

  listIncidents(): Promise<IncidentSummary[]> {
    const list: IncidentSummary[] = state.incidentOrder.map((id) => {
      const inc = state.incidents[id];
      const assigneeId = inc.task?.assigneeId ?? inc.candidates[0]?.developerId ?? null;
      const dev = assigneeId ? state.developers.find((d) => d.id === assigneeId) : undefined;
      return {
        id: inc.id,
        status: inc.status,
        title:
          inc.task?.title ??
          (inc.diagnosis?.category
            ? `[${inc.diagnosis.suspectedModuleId ?? 'triage'}] ${inc.diagnosis.category}`
            : inc.userMessage.slice(0, 48)),
        severity: inc.diagnosis?.severity ?? null,
        assignee: dev ? { id: dev.id, name: dev.name } : null,
        createdAt: inc.createdAt ?? '2026-10-31T12:30:00Z',
      };
    });
    return Promise.resolve(list);
  },

  getIncident(id: number): Promise<Incident> {
    const found = state.incidents[id];
    if (!found) {
      return Promise.reject(new Error(`404: Інцидент #${id} не знайдено`));
    }
    return Promise.resolve(JSON.parse(JSON.stringify(found)));
  },

  createIncident(payload: CreateIncidentRequest): Promise<AcceptedIncidentResponse> {
    const id = state.nextIncidentId++;
    const rawLog = payload.log || DEMO_LOGS.AMBIGUOUS;
    const linesCount = rawLog.split(/\r?\n/).filter((_, i, arr) => i < arr.length - 1 || arr[i] !== '').length;
    const scenario = detectScenarioFromLog(rawLog, payload.userMessage);

    const newInc: Incident = {
      id,
      status: 'NEW',
      userMessage: payload.userMessage || 'Скарга користувача без тексту',
      orderId: payload.orderId ?? null,
      userId: payload.userId ?? null,
      complaintAt: payload.complaintAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
      stages: [
        { name: 'PARSE', status: 'IN_PROGRESS' },
        { name: 'DETECT', status: 'PENDING' },
        { name: 'DIAGNOSE', status: 'PENDING' },
        { name: 'VERIFY_EVIDENCE', status: 'PENDING' },
        { name: 'ROUTE', status: 'PENDING' },
        { name: 'DISPATCH', status: 'PENDING' },
      ],
      logLines: linesCount,
      rawLog,
      findings: [],
      diagnosis: null,
      llmConfidence: null,
      finalConfidence: null,
      candidates: [],
      decision: null,
      task: null,
      dedupOf: null,
      pipelineSeconds: null,
      auditLog: [
        {
          ts: nowTimeStr(),
          actor: 'SYSTEM',
          event: `Інцидент #${id} прийнято (${linesCount} рядків логу)`,
        },
      ],
    };

    state.incidents[id] = newInc;
    state.incidentOrder = [id, ...state.incidentOrder];
    scheduleMockPipeline(id, scenario);
    return Promise.resolve({ id, status: 'NEW' });
  },

  async uploadIncident(formData: FormData): Promise<AcceptedIncidentResponse> {
    const userMessage = String(formData.get('userMessage') ?? 'Завантажений файл логу');
    const orderIdRaw = formData.get('orderId');
    const userIdRaw = formData.get('userId');
    const complaintAtRaw = formData.get('complaintAt');
    const file = formData.get('file');
    let log = '';
    if (file instanceof File) {
      log = await file.text();
    } else {
      log = String(formData.get('log') ?? '');
    }
    return this.createIncident({
      userMessage,
      log,
      orderId: orderIdRaw ? Number(orderIdRaw) : null,
      userId: userIdRaw ? Number(userIdRaw) : null,
      complaintAt: complaintAtRaw ? String(complaintAtRaw) : null,
    });
  },

  simulate(scenarioStr: string): Promise<AcceptedIncidentResponse> {
    const scenario = (scenarioStr as Scenario) in DEMO_LOGS ? (scenarioStr as Scenario) : 'DUP_CHARGE';
    const meta = COMPLAINTS_BY_SCENARIO[scenario];
    return this.createIncident({
      userMessage: meta.userMessage,
      log: DEMO_LOGS[scenario],
      orderId: meta.orderId,
      userId: meta.userId,
      complaintAt: new Date().toISOString(),
    });
  },

  confirm(id: number, assigneeId?: string): Promise<Incident> {
    const inc = state.incidents[id];
    if (!inc) return Promise.reject(new Error(`404: Інцидент #${id} не знайдено`));
    if (inc.status === 'AUTO_DISPATCHED' && inc.task) {
      return Promise.resolve(JSON.parse(JSON.stringify(inc)));
    }
    if (inc.status !== 'PENDING_CONFIRM' && inc.status !== 'NEEDS_TRIAGE') {
      return Promise.reject(new Error(`409: Підтвердження недоступне для статусу ${inc.status}`));
    }
    const chosenId = assigneeId || inc.candidates[0]?.developerId;
    if (!chosenId) {
      return Promise.reject(new Error('400: Для NEEDS_TRIAGE обов’язково оберіть виконавця (assigneeId)'));
    }
    const dev = state.developers.find((d) => d.id === chosenId);
    if (!dev) {
      return Promise.reject(new Error(`404: Розробника ${chosenId} не знайдено`));
    }
    if (!dev.available) {
      return Promise.reject(new Error(`409: Розробник ${dev.name} зараз недоступний`));
    }

    const draft = state.incidentTaskDrafts[id] ?? {
      title: `[${inc.diagnosis?.suspectedModuleId ?? 'triage'}] Інцидент #${id}`,
      bodyMd: `## Інцидент [#${id}](/?incidentId=${id})\n${inc.userMessage}`,
      priority: inc.diagnosis?.severity ?? 'P2',
      signature: `manual_incident:${id}`,
    };
    const fp = state.incidentFingerprints[id] ?? `fp-manual-${id}`;
    const backup = inc.candidates.find((c) => c.developerId !== chosenId);

    const newTask: DevTask = {
      id: state.nextTaskId++,
      incidentId: id,
      title: draft.title,
      priority: draft.priority,
      assigneeId: dev.id,
      backupId: backup?.developerId ?? undefined,
      occurrences: 1,
      bodyMd: draft.bodyMd.replace(
        /\*\*Виконавець:\*\* .*$/,
        `**Виконавець:** ${dev.name} (\`${dev.id}\`) · **Повторень:** 1`
      ),
      deliveryStatus: 'IN_APP',
      status: 'OPEN',
    };

    state.tasks[newTask.id] = newTask;
    state.fingerprintToTaskId[fp] = newTask.id;

    inc.status = 'AUTO_DISPATCHED';
    inc.task = newTask;
    inc.decision = {
      outcome: 'AUTO_DISPATCHED',
      rule: inc.decision?.rule ?? 'MANUAL',
      reason: `Підтверджено людиною (HUMAN) → призначено на ${dev.name}`,
    };
    inc.stages = inc.stages.map((s) =>
      s.name === 'DISPATCH' ? { ...s, status: 'DONE', ms: 18 } : s
    );
    inc.auditLog.push({
      ts: nowTimeStr(),
      actor: 'HUMAN',
      event: `Підтверджено та відправлено завдання #${newTask.id} виконавцю ${dev.name}`,
    });

    return Promise.resolve(JSON.parse(JSON.stringify(inc)));
  },

  dismiss(id: number): Promise<Incident> {
    const inc = state.incidents[id];
    if (!inc) return Promise.reject(new Error(`404: Інцидент #${id} не знайдено`));
    if (inc.status === 'AUTO_DISPATCHED' || inc.status === 'DEDUPLICATED') {
      return Promise.reject(new Error(`409: Неможливо відхилити вже відправлений інцидент`));
    }
    inc.status = 'DISMISSED';
    inc.decision = {
      outcome: 'DISMISSED',
      rule: 'HUMAN',
      reason: 'Закрито оператором як не-баг (Dismissed)',
    };
    inc.auditLog.push({
      ts: nowTimeStr(),
      actor: 'HUMAN',
      event: 'Інцидент відхилено як не-баг (DISMISSED)',
    });
    return Promise.resolve(JSON.parse(JSON.stringify(inc)));
  },

  developers(): Promise<Developer[]> {
    return Promise.resolve(JSON.parse(JSON.stringify(state.developers)));
  },

  modules(): Promise<ModuleCatalogItem[]> {
    return Promise.resolve(JSON.parse(JSON.stringify(state.modules)));
  },

  tasks(assigneeId?: string): Promise<DevTask[]> {
    const all = Object.values(state.tasks).sort((a, b) => b.id - a.id);
    const filtered = assigneeId ? all.filter((t) => t.assigneeId === assigneeId) : all;
    return Promise.resolve(JSON.parse(JSON.stringify(filtered)));
  },

  setTaskStatus(id: number, status: 'ACK' | 'DONE'): Promise<DevTask> {
    const t = state.tasks[id];
    if (!t) return Promise.reject(new Error(`404: Завдання #${id} не знайдено`));
    if (t.status === 'DONE' && status === 'ACK') {
      return Promise.reject(new Error('409: DONE є термінальним статусом (перехід DONE → ACK заборонений)'));
    }
    t.status = status;
    return Promise.resolve(JSON.parse(JSON.stringify(t)));
  },

  settings(): Promise<Settings> {
    return Promise.resolve({ ...state.settings });
  },

  putSettings(s: Settings): Promise<Settings> {
    state.settings = { autoDispatch: Boolean(s.autoDispatch) };
    return Promise.resolve({ ...state.settings });
  },

  metrics(): Promise<Metrics> {
    const all = Object.values(state.incidents);
    const total = all.length;
    if (total === 0) {
      return Promise.resolve({
        avgPipelineSec: 0,
        autoDispatchedPercent: 0,
        dedupMerged: 0,
        total: 0,
      });
    }
    const measured = all.filter((i) => typeof i.pipelineSeconds === 'number' && i.pipelineSeconds > 0);
    const avgPipelineSec =
      measured.length > 0
        ? Number(
            (
              measured.reduce((acc, cur) => acc + (cur.pipelineSeconds ?? 0), 0) / measured.length
            ).toFixed(1)
          )
        : 6.2;
    const autoCount = all.filter((i) => i.status === 'AUTO_DISPATCHED').length;
    const dedupMerged = all.filter((i) => i.status === 'DEDUPLICATED').length;
    return Promise.resolve({
      avgPipelineSec,
      autoDispatchedPercent: Math.round((autoCount / total) * 100),
      dedupMerged,
      total,
    });
  },

  markdown(id: number): Promise<string> {
    const t = state.tasks[id];
    if (!t) return Promise.reject(new Error(`404: Завдання #${id} не знайдено`));
    return Promise.resolve(`# ${t.title}\n\nPriority: **${t.priority}** · Status: **${t.status ?? 'OPEN'}**\n\n${t.bodyMd}`);
  },

  reset(): Promise<void> {
    state = createInitialState();
    // Як вимагає ТЗ: "Reset видаляє інциденти й задачі, тому після нього очищай вибір і перечитуй списки"
    state.incidents = {};
    state.incidentOrder = [];
    state.tasks = {};
    state.fingerprintToTaskId = {};
    state.incidentFingerprints = {};
    state.incidentTaskDrafts = {};
    state.settings = { autoDispatch: true };
    return Promise.resolve();
  },
};
