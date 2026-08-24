import sys
import os
import unittest
from unittest.mock import MagicMock

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Setup GenLayer Environment Mocks for Execution Simulation
class MockAddress(str): pass
class MockBigInt(int): pass
class MockUserError(Exception): pass

class MockReturn:
    def __init__(self, calldata):
        self.calldata = calldata

class MockContractStub:
    def __init__(self, address, tracker):
        self.address = address
        self.tracker = tracker

    def emit_transfer(self, value):
        self.tracker.append({"to": self.address, "value": int(value)})

class MockGL:
    class Contract:
        def __init__(self):
            self.tasks = {}
            self.task_ids = []
            self.platform_admin = "0xadmin"

    class public:
        @staticmethod
        def view(fn): return fn
        @staticmethod
        def write(fn): return fn

    class message:
        value = MockBigInt(0)
        sender_address = MockAddress("0xBuyer")

    class nondet:
        class web:
            @staticmethod
            def render(url, mode="text"): pass
        @staticmethod
        def exec_prompt(prompt, response_format="json"): pass

    class vm:
        Return = MockReturn
        @staticmethod
        def run_nondet(leader_fn, validator_fn):
            res = leader_fn()
            ret = MockReturn(calldata=res)
            if not validator_fn(ret):
                raise MockUserError("Consensus Disagreement")
            return res

    def __init__(self):
        self.transfers = []
        self.message_raw = {"datetime": "2026-08-23T00:00:00+00:00"}

    def get_contract_at(self, address):
        return MockContractStub(address, self.transfers)

MockGL.public.write.payable = lambda fn: fn

mock_mod = MagicMock()
mock_mod.gl = MockGL()
mock_mod.allow_storage = lambda cls: cls
mock_mod.Address = MockAddress
mock_mod.bigint = MockBigInt
mock_mod.u256 = MockBigInt
mock_mod.UserError = MockUserError
mock_mod.TreeMap = dict
mock_mod.DynArray = list

sys.modules["genlayer"] = mock_mod
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
import DatasetBounty as contract_module

def run_full_onchain_arbitration_test():
    print("=" * 70)
    print(" 🚀 DatasetBounty Protocol: Full On-Chain Arbitration & Governance Test ")
    print("=" * 70)

    gl = mock_mod.gl
    gl.transfers = []
    gl.message_raw = {"datetime": "2026-08-23T00:00:00+00:00"}

    admin = MockAddress("0xplatform_admin_000000000000000000000000")
    buyer = MockAddress("0xbuyer_ai_lab_111111111111111111111111")
    contributor = MockAddress("0xcontributor_dev_2222222222222222222222")

    # Initialize Contract
    gl.message.sender_address = admin
    contract = contract_module.Contract()
    contract.tasks = {}
    contract.task_ids = []
    contract.platform_admin = admin.lower()

    task_id = "bounty_arbitration_live_test_01"

    # Step 1: Create Bounty with 1000 GEN Escrow
    print("\n[Step 1] AI Lab Creates Bounty Task...")
    gl.message.sender_address = buyer
    gl.message.value = MockBigInt(1000)
    contract.create_bounty(
        task_id,
        "https://ai-lab.io/specs/code_eval.json",
        "JSONL format, MIT License, 10,000 verified code pairs",
        "scraped_copyright_code, leaked_keys"
    )
    task = contract.tasks[task_id]
    print(f"   ✓ Task Created: ID={task_id}, Status={task.status}, Escrow={task.escrow_amount} GEN")
    assert task.status == "OPEN"

    # Step 2: Contributor Accepts Bounty with 20% Stake (200 GEN)
    print("\n[Step 2] Contributor Accepts Bounty with 20% Mandatory Stake...")
    gl.message.sender_address = contributor
    gl.message.value = MockBigInt(200)
    contract.accept_bounty(task_id)
    task = contract.tasks[task_id]
    print(f"   ✓ Task Accepted: Contributor={task.contributor[:10]}..., Stake={task.contributor_stake} GEN, Status={task.status}")
    assert task.status == "IN_PROGRESS"

    # Step 3: Contributor Submits Dataset Sample & Triggers AI Consensus Quality Audit
    print("\n[Step 3] Submitting Dataset Sample & Triggering GenLayer AI Consensus Audit...")
    gl.nondet.web.render = lambda url, mode="text": "Valid JSONL code pairs dataset stream"
    gl.nondet.exec_prompt = lambda p, response_format="json": {
        "verdict": "APPROVED",
        "confidence": 98,
        "reason": "100% Schema & MIT License compliant. Zero blacklisted source artifacts."
    }

    contract.submit_dataset(task_id, "https://storage.io/sample_dataset_v1.jsonl")
    task = contract.tasks[task_id]
    print(f"   ✓ AI Audit Completed: Verdict={task.verdict}, Confidence={task.confidence}%, Status={task.status}")
    print(f"   ✓ 24h Dispute Cooling-Off Window Active (Payout Ready At: {task.payout_ready_at})")
    assert task.status == "AWAITING_PAYOUT"

    # Step 4: Buyer Raises Dispute During 24h Cooling-Off Window
    print("\n[Step 4] Buyer Raises Dispute at T+12 Hours...")
    gl.message_raw = {"datetime": "2026-08-23T12:00:00+00:00"}
    gl.message.sender_address = buyer
    contract.raise_dispute(task_id, "Sample doc_004 has duplicate bounding box coordinates")
    task = contract.tasks[task_id]
    print(f"   ✓ Dispute Raised: Status={task.status}, Reason=\"{task.reason}\"")
    assert task.status == "DISPUTED"

    # Step 5: Contributor Attempts Early Finalization -> MUST REVERT
    print("\n[Step 5] Testing Security Guard: Contributor Attempts Finalize Payout on Disputed Task...")
    gl.message_raw = {"datetime": "2026-08-24T02:00:00+00:00"} # T+26h
    gl.message.sender_address = contributor
    try:
        contract.finalize_payout(task_id)
        print("   ❌ SECURITY FAIL: Disputed payout was finalized!")
        sys.exit(1)
    except MockUserError as e:
        print(f"   ✓ SECURITY PASS: Payout correctly blocked by smart contract! ({e})")

    # Step 6: Platform Admin Arbitrates Dispute with SPLIT Action (50/50)
    print("\n[Step 6] Platform Admin Executes Governance Arbitration (SPLIT Resolution)...")
    gl.message.sender_address = admin
    contract.resolve_escalation(task_id, "SPLIT")
    task = contract.tasks[task_id]
    print(f"   ✓ Arbitration Complete: Status={task.status}, Escrow Left={task.escrow_amount} GEN")
    assert task.status == "CLOSED"

    # Step 7: Verify Token Disbursements
    print("\n[Step 7] Verifying Token Disbursement Receipts...")
    print(f"   - Transfers Count: {len(gl.transfers)}")
    for idx, tr in enumerate(gl.transfers, 1):
        print(f"     Receipt #{idx}: To={tr['to'][:12]}..., Value={tr['value']} GEN")

    # Expected: Contributor gets 500 (half escrow) + 200 (stake refund) = 700 GEN
    # Buyer gets 500 (half escrow) = 500 GEN
    assert gl.transfers[0]["to"] == contributor
    assert gl.transfers[0]["value"] == 700
    assert gl.transfers[1]["to"] == buyer
    assert gl.transfers[1]["value"] == 500

    print("\n" + "=" * 70)
    print(" 🎉 ALL ON-CHAIN ARBITRATION LIFECYCLE TESTS PASSED 100%! ")
    print("=" * 70)

if __name__ == "__main__":
    run_full_onchain_arbitration_test()
