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
        self.message_raw = {"datetime": "2026-08-24T00:00:00+00:00"}

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

def run_comprehensive_verdicts_test():
    print("=" * 75)
    print(" 🛡️ DatasetBounty Protocol: Full On-Chain Settlement & Arbitration Test Suite ")
    print(" Target Contract: 0xb6c92cB00D684581CeC4d1517D4eFCE827FFc0be ")
    print("=" * 75)

    gl = mock_mod.gl
    admin = MockAddress("0xadmin_governance_address_00000000000")
    buyer = MockAddress("0xbuyer_ai_lab_111111111111111111111")
    contributor = MockAddress("0xcontributor_dev_2222222222222222")

    # Initialize Contract
    gl.message.sender_address = admin
    contract = contract_module.Contract()
    contract.tasks = {}
    contract.task_ids = []
    contract.platform_admin = admin.lower()

    # ------------------------------------------------------------------------
    # SCENARIO 1: APPROVED VERDICT PATH (Full Escrow 1000 GEN + Stake 200 GEN -> Contributor)
    # ------------------------------------------------------------------------
    print("\n----------------------------------------------------------------------")
    print(" SCENARIO 1: APPROVED Verdict Path (100% Schema & License Compliant)")
    print("----------------------------------------------------------------------")
    gl.transfers = []
    gl.message_raw = {"datetime": "2026-08-24T00:00:00+00:00"}

    t1_id = "test_approved_flow_01"
    gl.message.sender_address = buyer
    gl.message.value = MockBigInt(1000)
    contract.create_bounty(t1_id, "https://ai-lab.io/spec.json", "JSONL, MIT", "scraped_domain")
    print(f"   ✓ Step 1: Created Bounty task '{t1_id}' (Escrow: 1000 GEN)")

    gl.message.sender_address = contributor
    gl.message.value = MockBigInt(200)
    contract.accept_bounty(t1_id)
    print(f"   ✓ Step 2: Contributor accepted with 20% stake (200 GEN)")

    gl.nondet.web.render = lambda *args, **kwargs: "Clean dataset content"
    gl.nondet.exec_prompt = lambda *args, **kwargs: {"verdict": "APPROVED", "confidence": 98, "reason": "100% Schema & License match"}
    contract.submit_dataset(t1_id, "https://storage.io/dataset_sample.jsonl")
    print(f"   ✓ Step 3: AI Audit Verdict: APPROVED (98% Conf) -> Status: AWAITING_PAYOUT")

    # Finalize at T+24h1m
    gl.message_raw = {"datetime": "2026-08-25T00:01:00+00:00"}
    contract.finalize_payout(t1_id)
    print(f"   ✓ Step 4: Finalized Payout at T+24h1m -> Contributor received {gl.transfers[0]['value']} GEN (1000 Escrow + 200 Stake)")
    assert gl.transfers[0]["to"] == contributor
    assert gl.transfers[0]["value"] == 1200
    assert contract.tasks[t1_id].status == "CLOSED"

    # ------------------------------------------------------------------------
    # SCENARIO 2: PARTIAL VERDICT PATH (50% Escrow + Stake -> Contributor; 50% Escrow -> Buyer)
    # ------------------------------------------------------------------------
    print("\n----------------------------------------------------------------------")
    print(" SCENARIO 2: PARTIAL Verdict Path (Minor Deviations - 50/50 Split)")
    print("----------------------------------------------------------------------")
    gl.transfers = []
    gl.message_raw = {"datetime": "2026-08-24T00:00:00+00:00"}

    t2_id = "test_partial_flow_02"
    gl.message.sender_address = buyer
    gl.message.value = MockBigInt(1000)
    contract.create_bounty(t2_id, "https://ai-lab.io/spec2.json", "JSONL, Apache-2.0", "noise_sources")

    gl.message.sender_address = contributor
    gl.message.value = MockBigInt(200)
    contract.accept_bounty(t2_id)

    gl.nondet.exec_prompt = lambda *args, **kwargs: {"verdict": "PARTIAL", "confidence": 85, "reason": "Minor formatting noise, core usable"}
    contract.submit_dataset(t2_id, "https://storage.io/partial_sample.jsonl")
    print(f"   ✓ Step 1: AI Audit Verdict: PARTIAL (85% Conf) -> Status: AWAITING_PAYOUT")

    gl.message_raw = {"datetime": "2026-08-25T00:01:00+00:00"}
    contract.finalize_payout(t2_id)
    print(f"   ✓ Step 2: Finalized Payout -> Contributor received {gl.transfers[0]['value']} GEN (500 + 200 stake); Buyer received {gl.transfers[1]['value']} GEN (500 rem)")
    assert gl.transfers[0]["value"] == 700
    assert gl.transfers[1]["value"] == 500

    # ------------------------------------------------------------------------
    # SCENARIO 3: REFUND / DOUBLE FAILURE SLASHING (2 Bad Submissions -> Slashes 200 Stake)
    # ------------------------------------------------------------------------
    print("\n----------------------------------------------------------------------")
    print(" SCENARIO 3: REFUND / Double Failure Slashing (2 Bad Submissions)")
    print("----------------------------------------------------------------------")
    gl.transfers = []
    gl.message_raw = {"datetime": "2026-08-24T00:00:00+00:00"}

    t3_id = "test_slashing_flow_03"
    gl.message.sender_address = buyer
    gl.message.value = MockBigInt(1000)
    contract.create_bounty(t3_id, "https://ai-lab.io/spec3.json", "Parquet, CC-BY-4.0", "darkweb_dumps")

    gl.message.sender_address = contributor
    gl.message.value = MockBigInt(200)
    contract.accept_bounty(t3_id)

    gl.nondet.exec_prompt = lambda *args, **kwargs: {"verdict": "REFUND", "confidence": 100, "reason": "Corrupted non-Parquet structure"}
    
    # Attempt 1: Revert to NEEDS_REVISION
    contract.submit_dataset(t3_id, "https://storage.io/corrupt_1.jsonl")
    print(f"   ✓ Attempt 1: AI Verdict REFUND -> Status: {contract.tasks[t3_id].status} (Needs Revision)")
    assert contract.tasks[t3_id].status == "NEEDS_REVISION"

    # Attempt 2: Double failure -> Slash stake + Full escrow to buyer
    contract.submit_dataset(t3_id, "https://storage.io/corrupt_2.jsonl")
    print(f"   ✓ Attempt 2: AI Verdict REFUND -> Status: {contract.tasks[t3_id].status} (CLOSED & Slashed)")
    print(f"   ✓ Buyer received slashed payout: {gl.transfers[0]['value']} GEN (1000 Escrow + 200 Slashed Stake)")
    assert gl.transfers[0]["to"] == buyer
    assert gl.transfers[0]["value"] == 1200

    # ------------------------------------------------------------------------
    # SCENARIO 4: DISPUTE & GOVERNANCE ARBITRATION (Buyer Dispute -> Admin SPLIT)
    # ------------------------------------------------------------------------
    print("\n----------------------------------------------------------------------")
    print(" SCENARIO 4: Dispute & Governance Arbitration (Admin SPLIT Action)")
    print("----------------------------------------------------------------------")
    gl.transfers = []
    gl.message_raw = {"datetime": "2026-08-24T00:00:00+00:00"}

    t4_id = "test_dispute_flow_04"
    gl.message.sender_address = buyer
    gl.message.value = MockBigInt(1000)
    contract.create_bounty(t4_id, "https://ai-lab.io/spec4.json", "JSONL, MIT", "scraped_data")

    gl.message.sender_address = contributor
    gl.message.value = MockBigInt(200)
    contract.accept_bounty(t4_id)

    gl.nondet.exec_prompt = lambda *args, **kwargs: {"verdict": "APPROVED", "confidence": 95, "reason": "Approved by AI"}
    contract.submit_dataset(t4_id, "https://storage.io/dataset_v4.jsonl")

    # Buyer raises dispute at T+10h
    gl.message_raw = {"datetime": "2026-08-24T10:00:00+00:00"}
    gl.message.sender_address = buyer
    contract.raise_dispute(t4_id, "Bounding box offset by 5px")
    print(f"   ✓ Step 1: Buyer Raised Dispute at T+10h -> Status: {contract.tasks[t4_id].status}")

    # Admin Arbitrates SPLIT
    gl.message.sender_address = admin
    contract.resolve_escalation(t4_id, "SPLIT")
    print(f"   ✓ Step 2: Admin Arbitrated with SPLIT -> Contributor got {gl.transfers[0]['value']} GEN, Buyer got {gl.transfers[1]['value']} GEN")
    assert contract.tasks[t4_id].status == "CLOSED"
    assert gl.transfers[0]["value"] == 700
    assert gl.transfers[1]["value"] == 500

    print("\n" + "=" * 75)
    print(" 🎉 ALL 4 ON-CHAIN SETTLEMENT & ARBITRATION SCENARIOS PASSED 100%! ")
    print(" Protocol Contract Target: 0xb6c92cB00D684581CeC4d1517D4eFCE827FFc0be ")
    print("=" * 75)

if __name__ == "__main__":
    run_comprehensive_verdicts_test()
