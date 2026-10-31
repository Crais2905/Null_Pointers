"""Lossless line-numbered parsing of text, JSONL and continuation lines."""
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone

STAMP = r'\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?'
HEADER = re.compile(rf'^(?P<ts>{STAMP})\s+(?P<level>TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL)\s+(?:\[(?P<service>[^]]+)\]\s*)?(?P<message>.*)$')


def timestamp(value):
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except (ValueError, TypeError):
        return None


def field(text, *names):
    match = re.search(r'\b(?:' + '|'.join(names) + r')=([^\s,;]+)', text)
    return match.group(1) if match else None

@dataclass
class Event:
    line: int
    ts: str | None
    level: str
    service: str | None
    trace_id: str | None
    order_id: str | None
    user_id: str | None
    message: str
    raw: str
    lines: list[int]


def truncate(text, max_lines=20000, max_bytes=5*1024*1024):
    encoded = text.encode('utf-8')
    prefix = encoded[:max_bytes].decode('utf-8', errors='ignore')
    lines = prefix.splitlines(keepends=True)
    limited = ''.join(lines[:max_lines])
    return limited, len(encoded) > max_bytes or len(lines) > max_lines


def parse_log(text):
    events = []
    for number, raw in enumerate(text.splitlines(), 1):
        data = None
        try:
            candidate = json.loads(raw)
            if isinstance(candidate, dict):
                data = candidate
        except (ValueError, TypeError):
            pass
        match = HEADER.match(raw)
        if data is not None or match:
            data = data if data is not None else match.groupdict()
            message = str(data.get('message', ''))
            level = str(data.get('level', 'UNKNOWN')).upper().replace('WARNING', 'WARN')
            ts = data.get('ts', data.get('timestamp'))
            events.append(Event(number, str(ts) if ts and timestamp(ts) else None, level,
                data.get('service', data.get('logger')), str(data.get('trace_id') or field(message, 'trace_id', 'trace') or '') or None,
                str(data.get('order_id') or field(message, 'order_id', 'order') or '') or None,
                str(data.get('user_id') or field(message, 'user_id', 'user') or '') or None,
                message, raw, [number]))
        elif events:
            events[-1].message += '\n' + raw
            events[-1].raw += '\n' + raw
            events[-1].lines.append(number)
        else:
            events.append(Event(number, None, 'UNKNOWN', None, None, None, None, raw, raw, [number]))
    times = [e.ts for e in events if e.ts]
    times.sort(key=timestamp)
    summary = dict(lines_total=len(text.splitlines()), time_range=[times[0], times[-1]] if times else [None, None],
        services=sorted({e.service for e in events if e.service}), levels=dict(Counter(e.level for e in events)))
    return events, summary
