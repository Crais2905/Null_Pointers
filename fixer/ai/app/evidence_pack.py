"""A bounded selection of masked physical lines with original numbering."""

def build_evidence_pack(text, events, findings, request, limit=150):
    lines = text.splitlines()
    priority = []
    for finding in findings:
        priority.extend(finding.line_numbers)
    for e in events:
        if e.level in ('ERROR', 'WARN', 'FATAL'):
            priority.extend(e.lines)
    ordered = list(dict.fromkeys(priority))
    for n in list(ordered):
        ordered.extend(range(max(1,n-3),min(len(lines),n+3)+1))
    for e in events:
        if (request.order_id is not None and e.order_id == str(request.order_id)) or (request.user_id is not None and e.user_id == str(request.user_id)) or e.trace_id:
            ordered.extend(e.lines)
    if not ordered:
        ordered = list(range(1, min(len(lines), limit)+1))
    unique = dict.fromkeys(n for n in ordered if 1 <= n <= len(lines))
    selected = sorted(list(unique)[:limit])
    return [{'line': n, 'text': lines[n-1]} for n in selected]
