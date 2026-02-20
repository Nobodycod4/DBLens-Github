"""
Structured logging with request_id support for correlation.
"""
import logging
import sys
from contextvars import ContextVar
from typing import Any

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


class RequestIdFilter(logging.Filter):
    """Add request_id to each log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(record, "request_id", "") or request_id_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    """Simple JSON-like format for structured logs (level, message, request_id, etc.)."""

    def format(self, record: logging.LogRecord) -> str:
        log_dict: dict[str, Any] = {
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if getattr(record, "request_id", None):
            log_dict["request_id"] = record.request_id
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)
        return str(log_dict)


def setup_logging(log_level: str = "INFO") -> None:
    """Configure root logger with request_id filter and level."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.addFilter(RequestIdFilter())
        handler.setFormatter(JsonFormatter())
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for the given module name."""
    return logging.getLogger(name)
