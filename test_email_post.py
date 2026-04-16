"""Quick test: Send a test post with Malayalam to Blogger via email."""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header

GMAIL = os.getenv("GMAIL_ADDRESS")
APP_PASS = os.getenv("GMAIL_APP_PASSWORD")
BLOGGER_EMAIL = os.getenv("BLOGGER_POST_EMAIL")

subject = "മലയാളം ടെസ്റ്റ് പോസ്റ്റ് (Test, Malayalam)"
html_body = "<b>മലയാളം ടെസ്റ്റ് പോസ്റ്റ്</b><br/><br/>This is a test with Malayalam characters."

msg = MIMEMultipart("alternative")
msg["From"] = GMAIL
msg["To"] = BLOGGER_EMAIL
msg["Subject"] = Header(subject, 'utf-8')
msg.attach(MIMEText(html_body, "html", "utf-8"))

try:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL, APP_PASS)
        server.sendmail(GMAIL, BLOGGER_EMAIL, msg.as_string())
    print("SUCCESS! Malayalam Test Email sent. Check your blog in ~30 seconds.")
except Exception as e:
    print(f"FAILED: {e}")
