from __future__ import annotations

import logging
from pathlib import Path

import requests

from .models import Evidence
from .reporting import console_summary

LOGGER = logging.getLogger(__name__)


def send_notifications(settings: dict, evidence: list[Evidence], report_path: Path) -> None:
    if not settings.get("enabled"):
        return

    message = _message(evidence, report_path)
    discord_url = str(settings.get("discord_webhook_url") or "").strip()
    if discord_url:
        _send_discord(discord_url, message)

    telegram_token = str(settings.get("telegram_bot_token") or "").strip()
    telegram_chat_id = str(settings.get("telegram_chat_id") or "").strip()
    if telegram_token and telegram_chat_id:
        _send_telegram(telegram_token, telegram_chat_id, message)


def _message(evidence: list[Evidence], report_path: Path) -> str:
    summary = console_summary(evidence, max_rows=8)
    return f"{summary}\n\nHTML report: {report_path}"


def _send_discord(webhook_url: str, message: str) -> None:
    try:
        response = requests.post(webhook_url, json={"content": message[:1900]}, timeout=20)
        response.raise_for_status()
    except Exception:
        LOGGER.exception("Discord notification failed")


def _send_telegram(bot_token: str, chat_id: str, message: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        response = requests.post(url, json={"chat_id": chat_id, "text": message[:3900]}, timeout=20)
        response.raise_for_status()
    except Exception:
        LOGGER.exception("Telegram notification failed")
