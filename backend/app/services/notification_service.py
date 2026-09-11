"""
Notification Service — PagerDuty (Events API v2) + Resend Email
Uses httpx for native async HTTP (no run_in_executor deadlocks).
Fires on: is_sos=True OR severity in [CRITICAL, HIGH]
"""
import os
import json
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

PAGERDUTY_ROUTING_KEY = os.getenv("PAGERDUTY_ROUTING_KEY", "")
ENABLE_PAGERDUTY      = os.getenv("ENABLE_PAGERDUTY", "true").lower() == "true"

RESEND_API_KEY        = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL     = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
NOTIFICATION_EMAIL    = os.getenv("NOTIFICATION_EMAIL", "")
ENABLE_RESEND         = os.getenv("ENABLE_RESEND", "true").lower() == "true"


async def trigger_pagerduty(
    incident_id: str,
    title: str,
    severity: str,
    category: str,
    latitude: float,
    longitude: float,
    is_sos: bool = False,
) -> dict:
    if not ENABLE_PAGERDUTY:
        print("[PagerDuty] DISABLED — skipping")
        return {"skipped": True}
    if not PAGERDUTY_ROUTING_KEY:
        print("[PagerDuty] ERROR — PAGERDUTY_ROUTING_KEY not set")
        return {"error": "routing key missing"}

    dedup_key = f"{incident_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    pd_severity = (
        "critical" if (is_sos or severity == "CRITICAL")
        else "error" if severity == "HIGH"
        else "warning"
    )

    payload = {
        "routing_key": PAGERDUTY_ROUTING_KEY,
        "event_action": "trigger",
        "dedup_key": dedup_key,
        "payload": {
            "summary": f"{'SOS — ' if is_sos else ''}[{severity}] {title}",
            "severity": pd_severity,
            "source": "ps20-disaster-relief-app",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "custom_details": {
                "incident_id": incident_id,
                "category": category,
                "latitude": latitude,
                "longitude": longitude,
                "is_sos": is_sos,
                "app": "PS20 Disaster Relief & Emergency Coordinator",
            },
        },
        "client": "PS20 Command Center",
        "client_url": "http://localhost:5173",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload,
                headers={"Accept": "application/json"},
            )
        body = r.json() if r.content else {}
        if r.status_code == 202:
            print(f"[PagerDuty] ✅ Incident created | dedup_key: {dedup_key} | HTTP 202")
        else:
            print(f"[PagerDuty] ❌ Failed | status={r.status_code} | body={r.text}")
        return {"status": r.status_code, "body": body, "dedup_key": dedup_key}
    except Exception as ex:
        print(f"[PagerDuty] ❌ Exception: {ex}")
        return {"error": str(ex), "dedup_key": dedup_key}


async def send_resend_email(
    incident_id: str,
    title: str,
    severity: str,
    category: str,
    latitude: float,
    longitude: float,
    is_sos: bool = False,
) -> dict:
    if not ENABLE_RESEND:
        print("[Resend] DISABLED — skipping")
        return {"skipped": True}
    if not RESEND_API_KEY:
        print("[Resend] ERROR — RESEND_API_KEY not set")
        return {"error": "api key missing"}
    if not NOTIFICATION_EMAIL:
        print("[Resend] ERROR — NOTIFICATION_EMAIL not set")
        return {"error": "recipient email missing"}

    subject = f"{'SOS ALERT' if is_sos else 'Emergency Alert'} — {title}"
    color = "#DC2626" if (is_sos or severity == "CRITICAL") else "#F59E0B"
    html_body = f"""
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:2px solid {color};border-radius:8px;">
  <h1 style="color:{color};margin:0 0 16px">{'SOS DISPATCHED' if is_sos else severity + ' ALERT'}</h1>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#6B7280;width:130px">Incident ID</td><td style="padding:6px 0;font-weight:600">{incident_id}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280">Type</td><td style="padding:6px 0">{category}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280">Severity</td><td style="padding:6px 0;font-weight:600;color:{color}">{severity}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280">Location</td><td style="padding:6px 0">{latitude:.4f}, {longitude:.4f}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280">Time (UTC)</td><td style="padding:6px 0">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</td></tr>
  </table>
  <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">PS20 Disaster Relief &amp; Emergency Coordinator</p>
</div>
"""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                json={"from": RESEND_FROM_EMAIL, "to": [NOTIFICATION_EMAIL], "subject": subject, "html": html_body},
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            )
        body = r.json() if r.content else {}
        if r.status_code == 200:
            email_id = body.get("id", "unknown")
            print(f"[Resend] ✅ Email sent | id: {email_id} | to: {NOTIFICATION_EMAIL}")
        else:
            print(f"[Resend] ❌ Failed | status={r.status_code} | body={r.text}")
            if "1010" in r.text:
                print(f"[Resend] ℹ️  Error 1010: Free-tier restriction — 'to' must be the Resend account owner's verified email.")
                print(f"[Resend] ℹ️  Current recipient: {NOTIFICATION_EMAIL}")
                print(f"[Resend] ℹ️  Fix: Login at resend.com → Settings → find your account email → set as NOTIFICATION_EMAIL in .env")
        return {"status": r.status_code, "body": body}
    except Exception as ex:
        print(f"[Resend] ❌ Exception: {ex}")
        return {"error": str(ex)}


async def dispatch_notifications(
    incident_id: str,
    title: str,
    severity: str,
    category: str,
    latitude: float,
    longitude: float,
    is_sos: bool = False,
) -> dict:
    """
    Master dispatcher — fires PagerDuty + Resend in parallel.
    Called by CoordinationAgent when is_sos=True OR severity >= HIGH.
    """
    should_notify = is_sos or severity in ("CRITICAL", "HIGH")
    if not should_notify:
        print(f"[Notifications] Skipping — severity={severity}, is_sos={is_sos}")
        return {"skipped": True, "reason": "below_threshold"}

    sep = "=" * 60
    print(f"\n{sep}")
    print(f"[Notifications] DISPATCHING for incident {incident_id}")
    print(f"[Notifications]    Title: {title}")
    print(f"[Notifications]    Severity: {severity} | SOS: {is_sos}")
    print(sep + "\n")

    import asyncio
    pd_result, resend_result = await asyncio.gather(
        trigger_pagerduty(incident_id, title, severity, category, latitude, longitude, is_sos=is_sos),
        send_resend_email(incident_id, title, severity, category, latitude, longitude, is_sos=is_sos),
        return_exceptions=True,
    )

    if isinstance(pd_result, Exception):
        pd_result = {"error": str(pd_result)}
    if isinstance(resend_result, Exception):
        resend_result = {"error": str(resend_result)}

    print(f"[Notifications] PagerDuty result: {pd_result}")
    print(f"[Notifications] Resend result: {resend_result}")

    return {
        "pagerduty": pd_result,
        "resend": resend_result,
        "incident_id": incident_id,
    }
