"""PII redaction with reversible local character offsets (never sent to the LLM)."""
import re
from collections import Counter
from dataclasses import dataclass


def luhn(value):
    digits = [int(c) for c in value if c.isdigit()]
    return 13 <= len(digits) <= 19 and sum((d * 2 // 10 + d * 2 % 10) if i % 2 else d for i, d in enumerate(reversed(digits))) % 10 == 0

PATTERNS = [
    ('token', re.compile(r'(?i)(?<=Bearer )[A-Za-z0-9._~+/=-]+')),
    ('token', re.compile(r'(?i)(?:api[_-]?key|api[_-]?token|access[_-]?token|authorization)["\']?[ \t]*[=:][ \t]*["\']?([^\s"\'&,;]+)')),
    ('password', re.compile(r'(?i)(?:password|passwd|pwd)["\']?[ \t]*[=:][ \t]*["\']?([^\s"\'&,;]+)')),
    ('email', re.compile(r'[\w.*+%-]+@[\w.-]+\.[A-Za-z]{2,}')),
    ('card', re.compile(r'(?<!\w)(?:\d[ -]?){12,18}\d(?!\w)')),
    ('phone', re.compile(r'(?<!\w)\+\d[\d ()-]{8,18}\d(?!\w)')),
    ('phone', re.compile(r'(?i)(?:phone|tel|mobile)["\']?[ \t]*[=:][ \t]*([\d ()+-]{10,20})')),
]

@dataclass
class Masked:
    text: str
    counts: dict
    spans: list  # masked start/end -> original start/end

    def original_quote(self, raw, quote):
        start = self.text.find(quote)
        if not quote or start < 0:
            return None
        end = start + len(quote)
        for a, b, _, _ in self.spans:
            if a < start < b or a < end < b:
                return None
        def offset(pos):
            delta = 0
            for a, b, c, d in self.spans:
                if pos >= b:
                    delta += (d-c)-(b-a)
                elif pos == a:
                    return c
            return pos + delta
        result = raw[offset(start):offset(end)]
        return result if 0 < len(result) <= 200 else None


def redact(text):
    hits = []
    occupied = bytearray(len(text))
    for kind, pattern in PATTERNS:
        for match in pattern.finditer(text):
            a, b = match.span(1) if match.lastindex else match.span()
            if kind == 'card' and not luhn(text[a:b]):
                continue
            if not any(occupied[a:b]):
                hits.append((a, b, kind))
                occupied[a:b] = b"\1" * (b-a)
    for match in re.finditer(r'(?<![\w\d])(?:0\d{9}|\d{3}[ -]\d{3}[ -]\d{4})(?![\w\d])', text):
        a, b = match.span()
        if not any(occupied[a:b]):
            hits.append((a, b, 'phone'))
            occupied[a:b] = b"\1" * (b-a)
    parts, spans, counts, cursor, size = [], [], Counter(), 0, 0
    for a, b, kind in sorted(hits):
        prefix = text[cursor:a]
        replacement = f'[MASKED:{kind}]'
        parts.extend([prefix, replacement])
        size += len(prefix)
        spans.append((size, size+len(replacement), a, b))
        size += len(replacement)
        counts[kind] += 1
        cursor = b
    parts.append(text[cursor:])
    return Masked(''.join(parts), dict(counts), spans)


def mask_pii(text):
    result = redact(text)
    return result.text, result.counts
