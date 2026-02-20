"""In-memory per-IP API rate limiter."""
import time
from collections import defaultdict
from typing import Tuple

_request_times: dict[str, list[float]] = defaultdict(list)
_CLEANUP_AFTER = 120.0


def _cleanup(ip: str) -> None:
    now = time.monotonic()
    cutoff = now - _CLEANUP_AFTER
    _request_times[ip] = [t for t in _request_times[ip] if t > cutoff]
    if not _request_times[ip]:
        _request_times.pop(ip, None)


def check_api_rate_limit(ip: str, max_per_minute: int) -> Tuple[bool, float]:
    """
    Return (allowed, retry_after_seconds).
    If allowed is False, retry_after_seconds is the suggested Retry-After value.
    """
    now = time.monotonic()
    window_start = now - 60.0
    times = _request_times[ip]
    times[:] = [t for t in times if t > window_start]
    if len(times) >= max_per_minute:
        oldest = min(times) if times else now
        retry_after = max(1, int(60 - (now - oldest)))
        _cleanup(ip)
        return False, float(retry_after)
    times.append(now)
    _cleanup(ip)
    return True, 0.0
