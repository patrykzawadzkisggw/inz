import os
import types
from email.mime.multipart import MIMEMultipart

import pytest

import smtp as smtp_mod


def test_is_html_and_strip():
    assert smtp_mod._is_html('<html><body>ok</body></html>')
    assert not smtp_mod._is_html('plain text')

    html = '<html><head><style>p{}</style><script>console.log(1)</script></head><body><p>Hello<b>World</b></p></body></html>'
    text = smtp_mod._strip_html_to_text(html)
    assert 'Hello' in text
    assert '<' not in text and '>' not in text


class DummySMTP:
    def __init__(self, server, port, timeout=30):
        self.server = server
        self.port = port
        self.timeout = timeout
        self.logged_in = False
        self.sent = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def starttls(self):
        return True

    def login(self, user, pwd):
        self.logged_in = True

    def sendmail(self, from_addr, to_addrs, msg_str):
        self.sent.append((from_addr, to_addrs, msg_str))


def test_wyslij_mail_html_and_images(monkeypatch, tmp_path):
    monkeypatch.setenv('SMTP_SERVER', 'smtp.example')
    monkeypatch.setenv('SMTP_PORT', '2525')
    monkeypatch.setenv('SMTP_LOGIN', 'me@example.com')
    monkeypatch.setenv('SMTP_PASSWORD', 'secret')

    sent = {}

    def _smtp_factory(server, port, timeout=30):
        return DummySMTP(server, port, timeout)

    monkeypatch.setattr(smtp_mod, 'smtplib', types.SimpleNamespace(SMTP=_smtp_factory))

    html = '<html><body><h1>Hi</h1></body></html>'
    img = {'cid': 'c1', 'content': b'PNGDATA', 'mime': 'image/png'}
    smtp_mod.wyslij_mail('to@example.com', 'Temat', html, inline_images=[img])


def test_wyslij_mail_plain_no_exceptions(monkeypatch):
    monkeypatch.setenv('SMTP_SERVER', 'smtp.example')
    monkeypatch.setenv('SMTP_PORT', '2525')
    monkeypatch.setenv('SMTP_LOGIN', 'me@example.com')
    monkeypatch.setenv('SMTP_PASSWORD', 'secret')

    def _smtp_factory(server, port, timeout=30):
        return DummySMTP(server, port, timeout)

    monkeypatch.setattr(smtp_mod, 'smtplib', types.SimpleNamespace(SMTP=_smtp_factory))

    smtp_mod.wyslij_mail('to@example.com', 'Plain', 'Plain text body')
