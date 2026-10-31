from app.parser import parse_log, truncate


def test_formats_and_continuations():
    text = 'unrecognized\n2026-10-31T12:00:00Z ERROR [promo] trace=a order=2 fail\njava.lang.NullPointerException\n at com.app.Foo.run(Foo.java:2)\n{"timestamp":"2026-10-31T11:00:00Z","level":"INFO","logger":"api","message":"ok","user_id":4}'
    events, summary = parse_log(text)
    assert summary['lines_total'] == 5
    assert events[1].lines == [2, 3, 4]
    assert '\n'.join(e.raw for e in events) == text
    assert summary['time_range'][0] == '2026-10-31T11:00:00Z'
    assert events[2].user_id == '4'


def test_limits():
    assert truncate('а' * 10, max_bytes=5) == ('аа', True)
    assert truncate('a\nb\nc', max_lines=2) == ('a\nb\n', True)
    assert truncate('a\n', max_lines=1) == ('a\n', False)
