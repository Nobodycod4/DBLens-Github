#!/usr/bin/env python3
"""
Entry point for running DBLens (used by PyInstaller executable and direct run).
"""
import os
import sys

if getattr(sys, "frozen", False):
    _root = os.path.dirname(sys.executable)
else:
    _root = os.path.dirname(os.path.abspath(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("DBLENS_HOST", "0.0.0.0")
    port = int(os.environ.get("DBLENS_PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        factory=False,
    )
