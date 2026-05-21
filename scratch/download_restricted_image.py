import os
from supabase import create_client

OLD_URL = "https://luvdgrpykesexfuqgvvt.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dmRncnB5a2VzZXhmdXFndnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk5Nzg4OCwiZXhwIjoyMDkxNTczODg4fQ.5xOq6KogMyQxi21y5zqiWdk7214VXeNqE-xLwTj2mXg"

print("Connecting to old Supabase...")
client = create_client(OLD_URL, OLD_KEY)

try:
    print("Listing files in bucket 'submissions'...")
    res = client.storage.from_('submissions').list()
    print("Found files:", len(res))
    if len(res) > 0:
        print("First file:", res[0])
except Exception as e:
    print("Error listing bucket:", e)

try:
    print("Attempting to download file...")
    data = client.storage.from_('submissions').download('8-1778571961839-0.jpg')
    print("Successfully downloaded! Length:", len(data))
except Exception as e:
    print("Error downloading file:", e)
