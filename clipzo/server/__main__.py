"""`python -m server` — start Clipzo on http://127.0.0.1:8000 (CLIPZO_HOST / CLIPZO_PORT to change)."""

import uvicorn

from . import config

if __name__ == "__main__":
    print(f"\n  Clipzo : ouvre http://{'localhost' if config.HOST in ('127.0.0.1', '0.0.0.0') else config.HOST}:{config.PORT}\n")
    uvicorn.run("server.app:app", host=config.HOST, port=config.PORT, log_level="info")
