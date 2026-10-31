"""Sanitized LLM record/replay transport; no raw log or verification quotes."""
import hashlib
import json
import os
import tempfile
from pathlib import Path

CACHE = Path(__file__).resolve().parents[1] / 'cache'
class LlmTimeout(Exception):
    pass
class ReplayMiss(Exception):
    pass


def cache_key(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def call_llm(payload, output_schema):
    key = cache_key({'input': payload, 'schema': output_schema, 'model': os.getenv('LLM_MODEL', 'claude-sonnet-5-5'), 'prompt': (Path(__file__).parent/'prompts/diagnose.md').read_text(encoding='utf-8')})
    directory = Path(os.getenv('LLM_CACHE_DIR', str(CACHE)))
    path = directory / f'{key}.json'
    if os.getenv('REPLAY', '1') == '1':
        if not path.exists():
            raise ReplayMiss('No cached diagnosis for these analysis inputs')
        return json.loads(path.read_text(encoding='utf-8'))['output']
    import anthropic
    client = anthropic.Anthropic(timeout=float(os.getenv('LLM_TIMEOUT_SECONDS', '20')), max_retries=0)
    try:
        result = client.messages.create(model=os.getenv('LLM_MODEL', 'claude-sonnet-5-5'), max_tokens=4096, temperature=0,
            system=(Path(__file__).parent/'prompts/diagnose.md').read_text(encoding='utf-8'),
            tools=[{'name':'report_diagnosis','description':'Report evidence-based log diagnosis and task draft','input_schema':output_schema}],
            tool_choice={'type':'tool','name':'report_diagnosis'},
            messages=[{'role':'user','content':json.dumps(payload, ensure_ascii=False)}])
    except anthropic.APITimeoutError as exc:
        raise LlmTimeout('LLM timeout') from exc
    output = next((b.input for b in result.content if b.type == 'tool_use' and b.name == 'report_diagnosis'), None)
    return output


def record(payload, schema, output):
    # Only validated and re-masked output may enter the persistent cache.
    prompt = (Path(__file__).parent/'prompts/diagnose.md').read_text(encoding='utf-8')
    key = cache_key({'input':payload,'schema':schema,'model':os.getenv('LLM_MODEL','claude-sonnet-5-5'),'prompt':prompt})
    directory = Path(os.getenv('LLM_CACHE_DIR', str(CACHE)))
    directory.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=directory, delete=False) as stream:
        json.dump({'output':output}, stream, ensure_ascii=False, indent=2)
        temp = Path(stream.name)
    temp.replace(directory/f'{key}.json')
