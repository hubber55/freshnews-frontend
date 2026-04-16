"""
Get Refresh Token (Run Once)
-----------------------------
Run this script ONE TIME on your local PC to get your Blogger refresh token.
After you get the token, add it to your .env and GitHub Secrets.
You never need to run this again.

Usage:
    python get_refresh_token.py
"""

import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("BLOGGER_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("BLOGGER_CLIENT_SECRET", "")
REDIRECT_URI = "http://localhost:8080"
SCOPE = "https://www.googleapis.com/auth/blogger"

# Store auth code
auth_code_holder = []


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        code = query.get("code", [None])[0]
        if code:
            auth_code_holder.append(code)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"""
            <html><body style='font-family:sans-serif; text-align:center; padding:50px;'>
            <h2 style='color:green'>&#10003; Authorization Successful!</h2>
            <p>You can close this window and go back to your terminal.</p>
            </body></html>
            """)
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Error: No code received")

    def log_message(self, format, *args):
        pass  # Suppress HTTP server logs


def get_refresh_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ ERROR: Set BLOGGER_CLIENT_ID and BLOGGER_CLIENT_SECRET in .env first!")
        return

    # Step 1: Open browser for authorization
    auth_url = (
        f"https://accounts.google.com/o/oauth2/auth"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={SCOPE}"
        f"&access_type=offline"
        f"&prompt=consent"
    )

    print("=" * 55)
    print("🌐 FreshNews — Blogger Refresh Token Setup")
    print("=" * 55)
    print("\n1. Opening browser for Google authorization...")
    print("   (If browser doesn't open, visit the URL below manually)\n")
    print(f"   {auth_url}\n")

    webbrowser.open(auth_url)

    # Step 2: Start local server to capture redirect
    print("2. Waiting for Google callback on http://localhost:8080...")
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.handle_request()  # Handle one request then stop

    if not auth_code_holder:
        print("❌ Failed to capture authorization code.")
        return

    auth_code = auth_code_holder[0]
    print(f"   ✅ Got authorization code!\n")

    # Step 3: Exchange code for tokens
    print("3. Exchanging code for refresh token...")
    response = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": auth_code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    })

    data = response.json()

    if "refresh_token" in data:
        refresh_token = data["refresh_token"]
        print("\n" + "=" * 55)
        print("✅ SUCCESS! Here is your BLOGGER_REFRESH_TOKEN:")
        print("=" * 55)
        print(f"\n{refresh_token}\n")
        print("=" * 55)
        print("\n📋 Next Steps:")
        print("   1. Copy the token above")
        print("   2. Add it to your .env file:")
        print("      BLOGGER_REFRESH_TOKEN=<paste here>")
        print("   3. Add it to GitHub Secrets (same name)")
        print("\nYou only need to do this ONCE. ✅")
    else:
        print(f"❌ Failed to get refresh token: {data}")


if __name__ == "__main__":
    get_refresh_token()
