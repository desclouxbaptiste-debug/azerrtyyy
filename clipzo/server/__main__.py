"""`python -m server` — start Clipzo on http://127.0.0.1:8000 (CLIPZO_HOST / CLIPZO_PORT to change)."""

import os
import threading

import uvicorn

from . import config

if __name__ == "__main__":
    print(f"\n  Clipzo : ouvre http://{'localhost' if config.HOST in ('127.0.0.1', '0.0.0.0') else config.HOST}:{config.PORT}\n")
    try:
        # proxy_headers=False: a page on this computer could otherwise fake its address with X-Forwarded-For;
        # behind a real proxy, CLIPZO_TRUST_PROXY=1 reads that header where it matters (server/app.py)
        uvicorn.run("server.app:app", host=config.HOST, port=config.PORT, log_level="info", proxy_headers=False)
    finally:
        from .app import store

        store.stop()  # ask running analyses to stop (also after a second Ctrl+C)
        if os.name == "nt":
            # Windows can't interrupt the final wait for worker threads: give them 15 s, then exit.
            timer = threading.Timer(15, os._exit, (0,))
            timer.daemon = True
            timer.start()
