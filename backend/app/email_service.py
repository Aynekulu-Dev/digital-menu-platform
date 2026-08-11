"""
Sends the invite / password-reset emails.
SMTP ካልተዘጋጀ email ን server console/logs ላይ ብቻ ያሳያል (dev fallback).
"""
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("app.email")


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    if not settings.smtp_host:
        logger.warning(
            "SMTP not configured -- printing email instead of sending.\n"
            "----- EMAIL -----\nTo: %s\nSubject: %s\n\n%s\n-----------------",
            to_email, subject, text_body,
        )
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


def send_invite_email(to_email: str, restaurant_name: str, accept_url: str) -> None:
    subject = f"You're invited to manage {restaurant_name} on Digital Menu Platform"
    text_body = (
        f"You've been set up as the manager for {restaurant_name}.\n\n"
        f"Set your password to activate your account:\n{accept_url}\n\n"
        f"This link expires in {settings.invite_token_expire_hours} hours."
    )
    html_body = (
        f"<p>You've been set up as the manager for <strong>{restaurant_name}</strong>.</p>"
        f'<p><a href="{accept_url}">Set your password</a> to activate your account.</p>'
        f"<p style='color:#888;font-size:12px'>This link expires in "
        f"{settings.invite_token_expire_hours} hours.</p>"
    )
    send_email(to_email, subject, text_body, html_body)


def send_password_reset_email(to_email: str, restaurant_name: str, reset_url: str) -> None:
    subject = "Reset your Digital Menu Platform password"
    text_body = (
        f"Someone requested a password reset for {restaurant_name}.\n\n"
        f"Reset your password:\n{reset_url}\n\n"
        f"This link expires in {settings.reset_token_expire_hours} hours. "
        f"If you didn't request this, you can ignore this email."
    )
    html_body = (
        f"<p>Someone requested a password reset for <strong>{restaurant_name}</strong>.</p>"
        f'<p><a href="{reset_url}">Reset your password</a></p>'
        f"<p style='color:#888;font-size:12px'>This link expires in "
        f"{settings.reset_token_expire_hours} hours. If you didn't request this, "
        f"you can ignore this email.</p>"
    )
    send_email(to_email, subject, text_body, html_body)