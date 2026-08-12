"""
Sends the invite / password-reset emails.

Render's free-tier web services block outbound traffic to SMTP ports
(25, 465, 587), so plain smtplib will time out there even with correct
credentials -- see https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
We therefore send over HTTPS via the Resend API when RESEND_API_KEY is
set (works on any plan, including free). If it's not set, we fall back
to smtplib (fine for local dev or paid Render instances). If neither is
configured, we just log the email instead of sending it.
"""
import json
import logging
import smtplib
import urllib.request
import urllib.error
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("app.email")


class EmailSendError(Exception):
    """Raised when an email genuinely fails to send (not just unconfigured)."""


def _send_via_resend(to_email: str, subject: str, text_body: str, html_body: str | None) -> None:
    payload = {
        "from": settings.smtp_from_email,
        "to": [to_email],
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status >= 300:
                raise EmailSendError(f"Resend API returned status {resp.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise EmailSendError(f"Resend API error {e.code}: {body}") from e
    except urllib.error.URLError as e:
        raise EmailSendError(f"Could not reach Resend API: {e.reason}") from e


def _send_via_brevo(to_email: str, subject: str, text_body: str, html_body: str | None) -> None:
    payload = {
        "sender": {"email": settings.smtp_from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_body,
    }
    if html_body:
        payload["htmlContent"] = html_body

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.brevo_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status >= 300:
                raise EmailSendError(f"Brevo API returned status {resp.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise EmailSendError(f"Brevo API error {e.code}: {body}") from e
    except urllib.error.URLError as e:
        raise EmailSendError(f"Could not reach Brevo API: {e.reason}") from e


def _send_via_smtp(to_email: str, subject: str, text_body: str, html_body: str | None) -> None:
    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as e:
        raise EmailSendError(f"SMTP send failed: {e}") from e


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    if settings.resend_api_key:
        _send_via_resend(to_email, subject, text_body, html_body)
        return

    if settings.brevo_api_key:
        _send_via_brevo(to_email, subject, text_body, html_body)
        return

    if settings.smtp_host:
        _send_via_smtp(to_email, subject, text_body, html_body)
        return

    logger.warning(
        "No email provider configured (RESEND_API_KEY, BREVO_API_KEY, or SMTP_HOST) -- "
        "printing email instead of sending.\n"
        "----- EMAIL -----\nTo: %s\nSubject: %s\n\n%s\n-----------------",
        to_email, subject, text_body,
    )


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