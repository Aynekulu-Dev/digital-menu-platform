"""
Section 3.3.1, ActiveQuota.reset_monthly_scans() — the SDD's Celery
background job, reimplemented as a standalone script.

This deployment has no Celery worker/broker (see backend/README.md), so
instead of an in-process periodic task this runs as a **Render Cron Job**:
a separate scheduled service that spins up, runs this script once, and
exits. Wire it up via render.yaml (see the `menu-platform-reset-scans` cron
service) — Render's scheduler triggers it monthly.

Run manually to test:
    python -m scripts.reset_monthly_scans
"""
from app.database import SessionLocal
from app import models


def main():
    db = SessionLocal()
    try:
        updated = db.query(models.ActiveQuota).update({models.ActiveQuota.scan_count: 0})
        db.commit()
        print(f"reset_monthly_scans: cleared scan_count on {updated} tenant workspace(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
