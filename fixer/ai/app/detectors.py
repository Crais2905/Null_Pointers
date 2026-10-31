"""Deterministic detectors and stable, code-generated bug signatures."""
import os
import re
from collections import defaultdict
from .parser import field, timestamp
from .schemas import Finding


def normalize(text):
    text = re.sub(r'\b[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\b', '#', text)
    text = re.sub(r'\b\d{4}-\d\d-\d\d[T ][\d:.Z+-]+', '#', text)
    text = re.sub(r'\b(trace(?:_id)?|request_id|order(?:_id)?|user(?:_id)?|tx|attempt)=\S+', r'\1=#', text)
    return re.sub(r'\d+', '#', text)


def detect(events, request):
    findings = []
    signatures = {}
    def add(detector, selected, note, signature=None):
        numbers = sorted({n for e in selected for n in e.lines})
        findings.append(Finding(detector=detector, line_numbers=numbers,
            excerpt=selected[0].message[:200], note=note))
        if signature and detector not in signatures:
            signatures[detector] = normalize(signature)
    duplicates = defaultdict(list)
    upstream = defaultdict(list)
    exceptions = defaultdict(list)
    run, last_operation = [], None
    retry_limit = int(os.getenv('DETECT_RETRY_COUNT', '3'))
    for e in events:
        msg = e.message
        http = re.search(r'\b(GET|POST|PUT|PATCH|DELETE)\s+(\S+)', msg)
        status = re.search(r'(?:->\s*|status[=: ]+|returned\s+)([1-5]\d\d)\b', msg)
        rid = field(msg, 'request_id')
        if http and status and 200 <= int(status[1]) < 300 and rid and e.ts and (e.order_id or e.user_id):
            key = (http[1], http[2], ('order', e.order_id) if e.order_id else ('user', e.user_id))
            for prev, prev_rid in reversed(duplicates[key]):
                delta = (timestamp(e.ts)-timestamp(prev.ts)).total_seconds()
                if 0 <= delta < float(os.getenv('DETECT_DUP_SECONDS', '2')) and rid != prev_rid:
                    add('D1', [prev, e], f'Two successful requests in {delta:g}s with different request_id', f'dup_request {http[1]} {http[2]}')
                    break
            duplicates[key] = [(prev, old_rid) for prev, old_rid in duplicates[key] if old_rid != rid][-1:] + [(e, rid)]
        if re.search(r'timeout|timed out|connection refused|\b5\d\d\b', msg, re.I):
            host = re.search(r'\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?', msg)
            if host:
                upstream[host[0]].append(e)
        exc = re.search(r'\b((?:[\w$]+\.)*[\w$]*(?:Exception|Error))\b', msg)
        if exc:
            frame = re.search(r'at\s+((?!(?:java|javax|jdk|sun)\.)[\w.$]+)\(([^)]+)\)', msg)
            key = exc[1].split('.')[-1] + (' ' + frame[1] if frame else '')
            exceptions[key].append(e)
        if re.search(r'\b(?:401|403)\b|token expired|expired token', msg, re.I):
            add('D6', [e], 'Authentication or authorization failure', 'auth_failure ' + normalize(msg))
        operation = re.sub(r'\b(?:trace|request_id|order|user|attempt|retry|tx)=[^\s]+', '', msg)
        operation = ' '.join(normalize(operation).split())
        if operation == last_operation:
            run.append(e)
        else:
            if len(run) >= retry_limit and any(re.search(r'retry|retries|attempt=|timeout|timed out', item.message, re.I) for item in run):
                add('D3', run, f'Consecutive operation repeated {len(run)} times', 'retry ' + last_operation)
            run, last_operation = [e], operation
    if len(run) >= retry_limit and any(re.search(r'retry|retries|attempt=|timeout|timed out', item.message, re.I) for item in run):
        add('D3', run, f'Consecutive operation repeated {len(run)} times', 'retry ' + last_operation)
    for host, selected in upstream.items():
        add('D4', selected, f'{host}: {len(selected)} upstream failures', 'upstream_failure ' + host)
    for key, selected in exceptions.items():
        add('D5', selected, f'{key}: {len(selected)} occurrences', key)
    timed = sorted([e for e in events if e.ts], key=lambda e: timestamp(e.ts))
    left = 0
    error_count = 0
    for right, event in enumerate(timed):
        error_count += event.level in ('ERROR', 'FATAL')
        while (timestamp(event.ts)-timestamp(timed[left].ts)).total_seconds() > 60:
            error_count -= timed[left].level in ('ERROR', 'FATAL')
            left += 1
        size = right-left+1
        if error_count and (error_count >= int(os.getenv('DETECT_ERROR_COUNT', '5')) or error_count/size > float(os.getenv('DETECT_ERROR_RATIO', '.2'))):
            window = timed[left:right+1]
            errors = [e for e in window if e.level in ('ERROR','FATAL')]
            add('D2', errors, f'{len(errors)} errors / {len(window)} events in 60s', 'error_burst ' + (errors[0].service or 'unknown'))
            break
    traces = {e.trace_id for e in events if (request.order_id is not None and e.order_id == str(request.order_id)) or (request.user_id is not None and e.user_id == str(request.user_id))}
    correlated = [e for e in events if e.level in ('ERROR', 'FATAL') and (
        (request.order_id is not None and e.order_id == str(request.order_id)) or
        (request.user_id is not None and e.user_id == str(request.user_id)) or
        (e.trace_id is not None and e.trace_id in traces) or
        (request.complaint_at is not None and e.ts and abs((timestamp(e.ts)-request.complaint_at).total_seconds()) <= 300))]
    if correlated:
        correlated.sort(key=lambda e: timestamp(e.ts) if e.ts else timestamp('9999-01-01T00:00:00Z'))
        add('D7', correlated, f'Correlated errors; first error at line {correlated[0].line}')
    signature = next((signatures[d] for d in ['D5','D1','D4','D6','D3','D2'] if d in signatures), '')
    return findings, signature
