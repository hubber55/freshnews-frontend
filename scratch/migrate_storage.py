import os
import tempfile
from supabase import create_client, Client

# ==========================================
# 🔑 Storage Migration Credentials
# ==========================================

# Old Cloud Supabase (Source)
OLD_URL = "https://luvdgrpykesexfuqgvvt.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dmRncnB5a2VzZXhmdXFndnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk5Nzg4OCwiZXhwIjoyMDkxNTczODg4fQ.5xOq6KogMyQxi21y5zqiWdk7214VXeNqE-xLwTj2mXg"

# New Self-hosted Supabase (Target)
NEW_URL = "http://localhost:8000"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzg5ODI3ODcsImV4cCI6MjA5NDM0NjM4N30.j-O2PzcOCLUUTao_vtgSXYtBGwu6xnfGJT61w0zBtuI"

print("🔗 Connecting to Supabase clients...")
old_client: Client = create_client(OLD_URL, OLD_KEY)
new_client: Client = create_client(NEW_URL, NEW_KEY)


def ensure_bucket_exists(client: Client, name: str, is_public: bool = True):
    """Ensure target bucket exists in self-hosted Supabase."""
    try:
        buckets = client.storage.list_buckets()
        exists = any(b.name == name for b in buckets)
        if not exists:
            print(f"  🆕 Creating bucket '{name}' (public: {is_public})...")
            client.storage.create_bucket(name, options={"public": is_public})
            print(f"  ✅ Bucket '{name}' created successfully.")
        else:
            print(f"  ✔️ Bucket '{name}' already exists.")
    except Exception as e:
        print(f"  ⚠️ Error checking/creating bucket '{name}': {e}")


def list_all_files(client: Client, bucket: str, path: str = ""):
    """Recursively list all file paths inside a bucket."""
    files = []
    try:
        res = client.storage.from_(bucket).list(path, options={"limit": 100})
        for item in res:
            name = item.get("name")
            if not name or name == ".emptyFolderPlaceholder":
                continue
            
            full_path = f"{path}/{name}" if path else name
            
            # If metadata exists, it's a file; otherwise, it's a directory
            if item.get("metadata") is not None:
                files.append(full_path)
            else:
                # Recursively list subfolder
                files.extend(list_all_files(client, bucket, full_path))
    except Exception as e:
        print(f"  ⚠️ Error listing path '{path}' in bucket '{bucket}': {e}")
    return files


def migrate():
    print("\n🚀 Starting storage migration from Cloud to self-hosted...")
    
    try:
        # 1. Discover all buckets in old Supabase Cloud
        cloud_buckets = old_client.storage.list_buckets()
        print(f"📊 Discovered {len(cloud_buckets)} buckets in Cloud:")
        for b in cloud_buckets:
            print(f"  - {b.name} (public: {b.public})")
    except Exception as e:
        print(f"❌ Failed to fetch cloud buckets: {e}")
        return

    # 2. Process each bucket
    for bucket_obj in cloud_buckets:
        bucket_name = bucket_obj.name
        is_public = bucket_obj.public
        
        print(f"\n📦 Processing bucket: '{bucket_name}'")
        ensure_bucket_exists(new_client, bucket_name, is_public)
        
        # List all files in the cloud bucket
        files = list_all_files(old_client, bucket_name)
        print(f"🔎 Found {len(files)} files to copy:")
        for f in files:
            print(f"  - {f}")
            
        if not files:
            print("  ⏭️ Bucket is empty, skipping copy.")
            continue
            
        # Migrate each file
        success_count = 0
        for file_path in files:
            try:
                # Download file from Cloud to memory
                print(f"  ⬇️ Downloading '{file_path}'...")
                file_data = old_client.storage.from_(bucket_name).download(file_path)
                
                # Write to a temporary local file
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    tmp.write(file_data)
                    tmp_name = tmp.name
                
                # Upload to new self-hosted Supabase
                print(f"  ⬆️ Uploading '{file_path}'...")
                with open(tmp_name, 'rb') as f_in:
                    new_client.storage.from_(bucket_name).upload(
                        file_path,
                        f_in,
                        file_options={"cache-control": "3600", "upsert": "true"}
                    )
                
                # Clean up temp file
                os.remove(tmp_name)
                print(f"  ✅ Migrated '{file_path}'")
                success_count += 1
            except Exception as e:
                print(f"  ❌ Failed to migrate '{file_path}': {e}")
                
        print(f"🎉 Bucket '{bucket_name}' migration complete! Successfully copied {success_count}/{len(files)} files.")

    print("\n🏁 Storage migration finished successfully!")


if __name__ == "__main__":
    migrate()
