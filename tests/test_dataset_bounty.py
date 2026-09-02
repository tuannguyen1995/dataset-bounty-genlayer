import sys
import os
import unittest
import hashlib
from unittest.mock import MagicMock

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
        self.tracker.append({"to": self.address, "value": value})

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
            def render(url, mode="text"):
                if "spec" in url:
                    return "Dataset Specification JSON Schema"
                return "Valid JSONL code pairs"

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

SPEC_MOCK_CONTENT = "Dataset Specification JSON Schema"
SPEC_MOCK_HASH = hashlib.sha256(SPEC_MOCK_CONTENT.encode()).hexdigest()

class TestDatasetBountyExecutionSuite(unittest.TestCase):
    def setUp(self):
        self.gl = mock_mod.gl
        self.gl.transfers = []
        self.gl.message_raw = {"datetime": "2026-08-23T00:00:00+00:00"}
        self.admin = MockAddress("0xadmin")
        self.buyer = MockAddress("0xbuyer_ai_lab")
        self.contributor = MockAddress("0xcontributor_data")
        self.hacker = MockAddress("0xhacker")

        self.gl.message.sender_address = self.admin
        self.contract = contract_module.Contract()
        self.contract.tasks = {}
        self.contract.task_ids = []
        self.contract.platform_admin = self.admin.lower()

        # Buyer creates bounty with 1000 GEN escrow & anchored spec hash
        self.tid = "dataset_python_eval_01"
        self.gl.message.sender_address = self.buyer
        self.gl.message.value = MockBigInt(1000)
        self.contract.create_bounty(
            self.tid,
            "https://ai-lab.io/specs/python_eval.json",
            SPEC_MOCK_HASH,
            "JSONL format, MIT License, 10k verified code-docstring pairs",
            "scraped_copyright_code, leaked_keys"
        )

    def test_01_under_staking_reverts(self):
        """Contributor attempts to deposit < 20% stake -> MUST REVERT"""
        self.gl.message.sender_address = self.contributor
        self.gl.message.value = MockBigInt(199)
        with self.assertRaises(MockUserError):
            self.contract.accept_bounty(self.tid)

    def test_02_payout_cooling_off_and_finalization(self):
        """Valid dataset approved -> 24h cooling-off enforced before 1200 payout."""
        self.gl.message.sender_address = self.contributor
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_bounty(self.tid)

        def mock_render(url, mode="text"):
            if "spec" in url:
                return SPEC_MOCK_CONTENT
            return "Valid JSONL code pairs"

        self.gl.nondet.web.render = mock_render
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {
            "verdict": "APPROVED", "confidence": 98, "reason": "100% Schema & License compliant"
        }

        self.contract.submit_dataset(self.tid, "https://storage.io/dataset_sample.jsonl")
        self.assertEqual(self.contract.tasks[self.tid].status, "AWAITING_PAYOUT")

        # Early finalization at T+6h -> REVERT
        self.gl.message_raw = {"datetime": "2026-08-23T06:00:00+00:00"}
        with self.assertRaises(MockUserError):
            self.contract.finalize_payout(self.tid)

        # Finalization at T+24h01m -> SUCCEEDS
        self.gl.message_raw = {"datetime": "2026-08-24T00:01:00+00:00"}
        self.contract.finalize_payout(self.tid)
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(self.gl.transfers[0]["to"], self.contributor)
        self.assertEqual(self.gl.transfers[0]["value"], 1200) # 1000 reward + 200 stake refund

    def test_03_dispute_raised_blocks_finalization(self):
        """Buyer raises dispute during cooling-off -> blocks finalize_payout and enables arbitration."""
        self.gl.message.sender_address = self.contributor
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_bounty(self.tid)

        def mock_render(url, mode="text"):
            if "spec" in url:
                return SPEC_MOCK_CONTENT
            return "Valid dataset sample"

        self.gl.nondet.web.render = mock_render
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {"verdict": "APPROVED", "confidence": 95, "reason": "OK"}
        self.contract.submit_dataset(self.tid, "https://storage.io/sample.jsonl")

        # Buyer raises dispute at T+12h
        self.gl.message_raw = {"datetime": "2026-08-23T12:00:00+00:00"}
        self.gl.message.sender_address = self.buyer
        self.contract.raise_dispute(self.tid, "Data sample contains synthetic duplicates")
        self.assertEqual(self.contract.tasks[self.tid].status, "DISPUTED")

        # Contributor tries finalize at T+25h -> MUST REVERT
        self.gl.message_raw = {"datetime": "2026-08-24T01:00:00+00:00"}
        self.gl.message.sender_address = self.contributor
        with self.assertRaises(MockUserError):
            self.contract.finalize_payout(self.tid)

        # Admin arbitrates with SPLIT resolution
        self.gl.message.sender_address = self.admin
        self.contract.resolve_escalation(self.tid, "SPLIT")
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(len(self.gl.transfers), 2)
        self.assertEqual(self.gl.transfers[0]["to"], self.contributor)
        self.assertEqual(self.gl.transfers[0]["value"], 700) # 500 half escrow + 200 stake
        self.assertEqual(self.gl.transfers[1]["to"], self.buyer)
        self.assertEqual(self.gl.transfers[1]["value"], 500)

    def test_04_double_failure_slashes_contributor_stake(self):
        """Two consecutive corrupt submissions slashes 200 stake to buyer."""
        self.gl.message.sender_address = self.contributor
        self.gl.message.value = MockBigInt(200)
        self.contract.accept_bounty(self.tid)

        def mock_render(url, mode="text"):
            if "spec" in url:
                return SPEC_MOCK_CONTENT
            return "Corrupted non-JSONL data"

        self.gl.nondet.web.render = mock_render
        self.gl.nondet.exec_prompt = lambda p, response_format="json": {"verdict": "REFUND", "confidence": 100, "reason": "Malformed syntax"}

        # Attempt 1: revision required
        self.contract.submit_dataset(self.tid, "https://storage.io/fail1.jsonl")
        self.assertEqual(self.contract.tasks[self.tid].status, "NEEDS_REVISION")

        # Attempt 2: slashed
        self.contract.submit_dataset(self.tid, "https://storage.io/fail2.jsonl")
        self.assertEqual(self.contract.tasks[self.tid].status, "CLOSED")
        self.assertEqual(self.gl.transfers[0]["to"], self.buyer)
        self.assertEqual(self.gl.transfers[0]["value"], 1200) # 1000 escrow + 200 slashed stake

if __name__ == "__main__":
    unittest.main(verbosity=2)
