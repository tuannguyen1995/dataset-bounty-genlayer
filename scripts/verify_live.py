import urllib.request
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

url = "https://dataset-bounty-genlayer.vercel.app"
print(f"Fetching {url} ...")

req = urllib.request.urlopen(url)
status = req.status
print(f"Status Code: {status}")

content = req.read().decode("utf-8")
print("\nHTML Preview (First 1000 characters):")
print("-" * 50)
print(content[:1000])
print("-" * 50)

has_root = '<div id="root"></div>' in content or 'id="root"' in content
has_title = 'DatasetBounty' in content

print(f"\n✅ Verification Checks:")
print(f"   Status 200 OK: {'PASS' if status == 200 else 'FAIL'}")
print(f"   Contains <div id=\"root\">: {'PASS' if has_root else 'FAIL'}")
print(f"   Contains Project Name 'DatasetBounty': {'PASS' if has_title else 'FAIL'}")

if status == 200 and has_root and has_title:
    print("\n🎉 Verification Step 5 Passed 100%!")
else:
    print("\n❌ Verification Failed!")
