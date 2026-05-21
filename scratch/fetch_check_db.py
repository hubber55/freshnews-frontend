import urllib.request
import json
import time

url = 'https://freshnews.top/api/debug/check-db'
headers = {'User-Agent': 'Mozilla/5.0'}

print("Waiting for deployment to complete...")
for i in range(15):
    try:
        req = urllib.request.Request(url, headers=headers)
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode('utf-8'))
        if 'submissions' in data:
            print("\n🎉 Success! New deployment is live:")
            print(json.dumps(data['submissions'], indent=2))
            break
        else:
            print(f"[{i+1}/15] Stale version (no 'submissions' key)... waiting 10s...")
    except Exception as e:
        print(f"[{i+1}/15] Error fetching: {e}... waiting 10s...")
    time.sleep(10)
