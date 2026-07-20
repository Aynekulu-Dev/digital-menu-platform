"""
Bootstraps the very first super-admin account so you can log in and start
onboarding tenants. Run once after the database is migrated:

    python -m scripts.create_super_admin --name "Platform Owner" \
        --email owner@yourplatform.com --password "ChangeMe123!"

On Render, run this from the Shell tab of your web service once it's live.
"""
import argparse

from app.database import SessionLocal, Base, engine
from app import models
from app.auth import hash_password


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.SuperAdmin).filter(models.SuperAdmin.admin_email == args.email).first()
        if existing:
            print(f"Super admin with email {args.email} already exists (id={existing.id}).")
            return

        admin = models.SuperAdmin(
            full_name=args.name,
            admin_email=args.email,
            password_hash=hash_password(args.password),
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Created super admin id={admin.id} email={admin.admin_email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
