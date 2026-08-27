import os
import sys
import json
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def check_env_private_key():
    # Check ~/.env or local .env
    env_file = os.path.expanduser("~/.env")
    local_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", ".env"))
    
    key = None
    for ef in [local_env, env_file]:
        if os.path.exists(ef):
            with open(ef, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("PRIVATE_KEY=") or line.startswith("STU_PRIVATE_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        if key: break
    return key

def main():
    print("=" * 70)
    print(" 🚀 GenLayer Studionet Live Wallet On-Chain Transaction Test ")
    print(" Target Contract: 0xb6c92cB00D684581CeC4d1517D4eFCE827FFc0be ")
    print("=" * 70)

    key = check_env_private_key()
    if not key:
        print("❌ Error: PRIVATE_KEY not found in ~/.env or frontend/.env!")
        print("\nPlease run the following command in PowerShell to safely add your private key:")
        print('Add-Content -Path "$HOME\\.env" -Value "PRIVATE_KEY=0x_your_private_key"')
        sys.exit(1)

    print(f"✅ Found PRIVATE_KEY in environment (Length: {len(key)} chars)")
    print("Connecting to GenLayer Studionet RPC (https://studio.genlayer.com/api)...")

    # Read current state from contract get_all_tasks
    rpc_url = "https://studio.genlayer.com/api"
    contract_addr = "0xf219bf040d7bb6291b7E822411A46116C4125e0F"

    print(f"Querying contract tasks from Studionet for {contract_addr}...")
    try:
        req_data = json.dumps({
            "jsonrpc": "2.0",
            "method": "gen_readContract",
            "params": [
                {
                    "address": contract_addr,
                    "functionName": "get_all_tasks",
                    "args": []
                }
            ],
            "id": 1
        }).encode("utf-8")

        req = urllib.request.Request(rpc_url, data=req_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            print("✅ Studionet RPC Read Successful!")
            tasks = res_json.get("result", [])
            print(f"   Current Task Count on Contract: {len(tasks) if isinstance(tasks, list) else 'Response received'}")
    except Exception as e:
        print(f"⚠️ RPC Read Warning: {e}")

    print("\n🎉 Live wallet script ready to send transactions once key is verified.")

if __name__ == "__main__":
    main()
