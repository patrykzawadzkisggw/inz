import os
from dotenv import load_dotenv
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.utils import formatdate
from typing import List, Dict, Optional
load_dotenv()
def _is_html(content: str) -> bool:
    return bool(content and '<html' in content.lower())

def _strip_html_to_text(html: str) -> str:
    text = re.sub(r'<script.*?</script>', '', html, flags=re.I | re.S)
    text = re.sub(r'<style.*?</style>', '', text, flags=re.I | re.S)
    text = re.sub(r'<[^>]+>', '', text)
    return text

def _build_html_message(html: str, images: Optional[List[Dict]]) -> MIMEMultipart:
    container = MIMEMultipart('related')
    alt = MIMEMultipart('alternative')
    text_version = _strip_html_to_text(html)
    alt.attach(MIMEText(text_version, 'plain', 'utf-8'))
    alt.attach(MIMEText(html, 'html', 'utf-8'))
    container.attach(alt)
    if images:
        for img in images:
            try:
                content = img.get('content')
                cid = img.get('cid')
                mime = (img.get('mime') or 'image/png').lower()
                maintype, subtype = mime.split('/') if '/' in mime else ('image', 'png')
                if maintype != 'image' or not content or not cid:
                    continue
                part = MIMEImage(content, _subtype=subtype)
                part.add_header('Content-ID', f'<{cid}>')
                part.add_header('Content-Disposition', 'inline', filename=f'{cid}.{subtype}')
                container.attach(part)
            except Exception:
                continue
    return container

def _build_plain_message(text: str) -> MIMEMultipart:
    m = MIMEMultipart()
    m.attach(MIMEText(text, 'plain', 'utf-8'))
    return m

def wyslij_mail(odbiorca: str, temat: str, tresc: str, *, from_addr: str | None = None, inline_images: Optional[List[Dict]] = None):
    login = from_addr or os.getenv('SMTP_LOGIN')

    if _is_html(tresc):
        msg = _build_html_message(tresc, inline_images)
    else:
        msg = _build_plain_message(tresc)

    msg['From'] = login
    msg['To'] = odbiorca
    msg['Subject'] = temat
    msg['Date'] = formatdate(localtime=True)

    try:
        with smtplib.SMTP(os.getenv('SMTP_SERVER'), int(os.getenv('SMTP_PORT', '587')), timeout=30) as server:
            server.starttls()
            server.login(login, os.getenv('SMTP_PASSWORD'))
            server.sendmail(login, [odbiorca], msg.as_string())
    except Exception as e:
        print(f"Mail sending error: {e}")