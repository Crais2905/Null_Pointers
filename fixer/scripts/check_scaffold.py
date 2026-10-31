from pathlib import Path
import json, ast
root=Path(__file__).resolve().parents[1]
def load(p): return json.loads((root/p).read_text(encoding='utf-8'))
for p in root.rglob('*.json'):
    if not any(x in p.parts for x in ['node_modules','.venv','target']): json.loads(p.read_text(encoding='utf-8'))
for p in (root/'ai').rglob('*.py'):
    if '.venv' not in p.parts: ast.parse(p.read_text(encoding='utf-8'))
req=load('contracts/ai-analyze-log.request.json');res=load('contracts/ai-analyze-log.response.json')
lines=req['log_text'].splitlines()
assert len(lines)==res['parsed']['lines_total']
for e in res['diagnosis']['evidence']: assert e['quote'] in lines[e['line']-1]
assert load('web/src/api/mocks/incident.mock.json')==load('contracts/api-incident.json')
for p in (root/'backend/src/main/resources/seed/logs').glob('*.log'):
    assert 50<=len(p.read_text(encoding='utf-8').splitlines())<=150
    assert p.read_bytes()==(root/'ai/fixtures'/p.name).read_bytes()
assert load('ai/cache/dup_charge.json')==dict(request=req,response=res)
print('Scaffold checks passed: JSON, Python syntax, evidence, replay, logs')
