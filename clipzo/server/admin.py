"""Admin commands, run from the clipzo/ folder:

    python -m server.admin users                    list accounts with their plan and usage
    python -m server.admin set-plan <email> <plan>  give a plan by hand (free, creator, pro)
    python -m server.admin backup [file]            copy the accounts database (safe while running)
"""

from __future__ import annotations

import sqlite3
import sys
import time
from pathlib import Path

from . import accounts, config


def main(argv: list[str]) -> int:
    try:
        sys.stdout.reconfigure(errors="replace")  # Windows consoles / redirections in a legacy code page
    except AttributeError:
        pass
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    cmd, args = argv[0], argv[1:]
    if cmd == "users":
        rows = accounts.db().execute("SELECT id, email, plan, billing_status, created_at FROM users ORDER BY id").fetchall()
        for r in rows:
            used = accounts.used_this_month(r["id"])
            print(f"{r['id']:>5}  {r['email']:<40} {r['plan']:<8} {r['billing_status'] or '-':<10} {used} short(s) ce mois-ci")
        print(f"{len(rows)} compte(s)")
        return 0
    if cmd == "set-plan" and len(args) == 2:
        email, plan = args
        if plan not in config.PLANS:
            print(f"Forfait inconnu : {plan} (choix : {', '.join(config.PLANS)})")
            return 1
        user = accounts.get_user_by_email(email)
        if user is None:
            print(f"Aucun compte pour {email}")
            return 1
        accounts.set_plan(user.id, plan)
        print(f"{user.email} -> {config.PLANS[plan].label}")
        if user.stripe_subscription_id:
            print("Attention : ce compte a un abonnement Stripe, le prochain événement Stripe remplacera ce réglage.")
        return 0
    if cmd == "backup" and len(args) <= 1:
        dest = Path(args[0]) if args else config.DATA_DIR / f"sauvegarde-{time.strftime('%Y%m%d-%H%M%S')}.db"
        dest.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(dest) as out:
            with accounts._lock:
                accounts.db().backup(out)
        print(f"Sauvegarde écrite : {dest}")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
