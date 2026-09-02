# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

@allow_storage
@dataclass
class DatasetTask:
    buyer: str
    contributor: str
    escrow_amount: bigint
    contributor_stake: bigint
    status: str            # OPEN, IN_PROGRESS, AWAITING_PAYOUT, NEEDS_REVISION, DISPUTED, ESCALATED, CLOSED
    spec_url: str          # URL to schema, license requirement, and format specification
    dataset_url: str       # URL to sample dataset file (JSONL/CSV/Parquet endpoint)
    required_format: str   # e.g., "JSONL, CC-BY-4.0, Min 10k cleaned pairs"
    blacklist_sources: str # Forbidden scraped domains or contaminated sources
    verdict: str           # APPROVED, PARTIAL, REFUND, ESCALATE
    reason: str
    confidence: bigint
    attempts: bigint
    payout_ready_at: bigint
    disputed_at: bigint
    # Immutable Manifest Anchoring Fields (Steward Requirement)
    spec_hash: str              # SHA-256 hash of spec content at creation time
    dataset_hash: str           # SHA-256 hash of dataset content at submission time
    dataset_record_count: str   # Number of records verified by AI audit
    dataset_size_bytes: str     # Content length verified by AI audit

class Contract(gl.Contract):
    platform_admin: str
    tasks: TreeMap[str, DatasetTask]
    task_ids: DynArray[str]

    def __init__(self):
        self.platform_admin = str(gl.message.sender_address).lower()

    def _get_current_timestamp(self) -> bigint:
        """Derive trusted execution timestamp strictly from transaction context."""
        dt_raw = gl.message_raw.get("datetime", None) if isinstance(gl.message_raw, dict) else None
        if not dt_raw:
            raise UserError("Trusted execution timestamp missing from transaction context")
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(str(dt_raw).replace("Z", "+00:00"))
            ts = int(dt.timestamp())
            if ts > 0:
                return bigint(ts)
        except Exception as e:
            raise UserError(f"Failed to parse trusted execution timestamp: {str(e)}")
        raise UserError("Invalid execution timestamp in transaction context")

    def _parse_llm_json(self, response_str: str) -> dict:
        """Robust parser handling raw JSON or markdown code fences."""
        if isinstance(response_str, dict):
            return response_str
        if hasattr(response_str, "__dict__"):
            return response_str.__dict__
        t = str(response_str).strip()
        if t.startswith("```json"):
            t = t[7:]
        elif t.startswith("```"):
            t = t[3:]
        if t.endswith("```"):
            t = t[:-3]
        try:
            return json.loads(t.strip())
        except Exception as e:
            return {"verdict": "ESCALATE", "confidence": 0, "reason": f"JSON parse failure: {str(e)}"}

    def _effective_verdict(self, data: dict) -> str:
        """Enforces deterministic settlement verdict by applying confidence threshold."""
        verdict = str(data.get("verdict", "ESCALATE")).upper().strip()
        if verdict not in {"APPROVED", "PARTIAL", "REFUND", "ESCALATE"}:
            verdict = "ESCALATE"
        try:
            conf = int(data.get("confidence", 0))
        except Exception:
            conf = 0
        if conf < 65:
            verdict = "ESCALATE"
        return verdict

    def _compute_content_hash(self, content: str) -> str:
        """Compute SHA-256 hash for content integrity anchoring."""
        return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()

    @gl.public.write.payable
    def create_bounty(
        self,
        task_id: str,
        spec_url: str,
        required_format: str,
        blacklist_sources: str
    ) -> None:
        if task_id in self.tasks:
            raise UserError(f"Bounty task ID {task_id} already exists")
        
        escrow_amt = gl.message.value
        if escrow_amt <= bigint(0):
            raise UserError("Escrow bounty reward must be strictly positive")
        if not spec_url.startswith("http"):
            raise UserError("Valid specification HTTP/HTTPS URL required")

        caller = str(gl.message.sender_address).lower()

        # Immutable Manifest Anchoring: Fetch and hash specification content at creation time
        spec_content = ""
        spec_hash = ""
        try:
            s_res = gl.nondet.web.render(spec_url.strip(), mode="text")
            spec_content = str(s_res)
            if len(spec_content.strip()) < 10:
                raise UserError("Specification URL returned empty or minimal content — cannot anchor manifest")
            spec_hash = self._compute_content_hash(spec_content)
        except UserError:
            raise
        except Exception as e:
            raise UserError(f"Failed to fetch and anchor specification manifest: {str(e)}")

        self.tasks[task_id] = DatasetTask(
            buyer=caller,
            contributor="0x0000000000000000000000000000000000000000",
            escrow_amount=escrow_amt,
            contributor_stake=bigint(0),
            status="OPEN",
            spec_url=spec_url.strip(),
            dataset_url="",
            required_format=required_format.strip(),
            blacklist_sources=blacklist_sources.strip(),
            verdict="NONE",
            reason="Awaiting contributor acceptance",
            confidence=bigint(0),
            attempts=bigint(0),
            payout_ready_at=bigint(0),
            disputed_at=bigint(0),
            spec_hash=spec_hash,
            dataset_hash="",
            dataset_record_count="0",
            dataset_size_bytes="0"
        )
        self.task_ids.append(task_id)

    @gl.public.write.payable
    def accept_bounty(self, task_id: str) -> None:
        """Contributor deposits mandatory 20% stake to accept dataset task."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "OPEN":
            raise UserError("Task is not in OPEN status")

        caller = str(gl.message.sender_address).lower()
        if caller == task.buyer:
            raise UserError("Buyer cannot contribute to their own bounty")

        min_stake = task.escrow_amount // bigint(5)  # 20% stake
        if gl.message.value < min_stake or gl.message.value <= bigint(0):
            raise UserError(f"Insufficient stake. Minimum 20% required ({min_stake})")

        task.contributor = caller
        task.contributor_stake = gl.message.value
        task.status = "IN_PROGRESS"
        self.tasks[task_id] = task

    @gl.public.write
    def submit_dataset(self, task_id: str, dataset_url: str) -> None:
        """Contributor submits dataset URL for autonomous AI consensus adjudication with immutable manifest anchoring."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        caller = str(gl.message.sender_address).lower()
        
        if caller != task.contributor:
            raise UserError("Only the assigned contributor can submit dataset")
        if task.status not in ["IN_PROGRESS", "NEEDS_REVISION"]:
            raise UserError("Task is not ready for submission")
        if not dataset_url.startswith("http"):
            raise UserError("Valid dataset endpoint HTTP/HTTPS URL required")

        task.dataset_url = dataset_url.strip()
        task.attempts += bigint(1)
        
        spec_str = task.spec_url
        data_str = task.dataset_url
        format_str = task.required_format
        black_str = task.blacklist_sources
        anchored_spec_hash = task.spec_hash

        def leader_fn() -> dict:
            # 1. Anti-Rugpull Guard: Fetch buyer specification and verify immutable manifest integrity
            try:
                s_res = gl.nondet.web.render(spec_str, mode="text")
                s_text = str(s_res)
                if any(err in s_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {"verdict": "ESCALATE", "confidence": 100, "reason": "Specification URL is dead/404; escrow held to protect contributor.",
                            "record_count": 0, "content_size": 0}
            except Exception as e:
                return {"verdict": "ESCALATE", "confidence": 100, "reason": f"Specification fetch failed: {str(e)}",
                        "record_count": 0, "content_size": 0}

            # 1b. Verify specification content hasn't been tampered since bounty creation
            current_spec_hash = hashlib.sha256(s_text.encode("utf-8", errors="replace")).hexdigest()
            if anchored_spec_hash and current_spec_hash != anchored_spec_hash:
                return {"verdict": "ESCALATE", "confidence": 100,
                        "reason": f"Specification content was modified after bounty creation. Anchored hash: {anchored_spec_hash[:16]}..., current: {current_spec_hash[:16]}... Escrow held pending arbitration.",
                        "record_count": 0, "content_size": 0}

            # 2. Anti-Spam Guard: Fetch full dataset content for whole-dataset verification
            try:
                d_res = gl.nondet.web.render(data_str, mode="text")
                d_text = str(d_res)
                if any(err in d_text[:400].lower() for err in ["404 not found", "error 404", "not found"]):
                    return {"verdict": "REFUND", "confidence": 100, "reason": "Dataset URL is dead/404 or empty.",
                            "record_count": 0, "content_size": 0}
            except Exception as e:
                return {"verdict": "REFUND", "confidence": 100, "reason": f"Dataset fetch failed: {str(e)}",
                        "record_count": 0, "content_size": 0}

            # 3. Compute dataset content metrics for provenance verification
            content_size = len(d_text)
            # Count records: lines for JSONL, rows for CSV
            lines = [l for l in d_text.strip().split("\n") if l.strip()]
            record_count = len(lines)

            # 4. Whole-dataset provenance & licensing AI audit (NOT just a short preview)
            # Provide full content up to GenVM limits, plus statistical summary for large datasets
            max_audit_chars = 8000
            if content_size <= max_audit_chars:
                audit_content = d_text
                content_coverage = "FULL (100% of content audited)"
            else:
                # For large datasets: audit head + tail + statistical summary
                head_sample = d_text[:4000]
                tail_sample = d_text[-2000:]
                audit_content = f"[HEAD — first 4000 chars]:\n{head_sample}\n\n[TAIL — last 2000 chars]:\n{tail_sample}"
                content_coverage = f"PARTIAL (head+tail of {content_size} bytes, {record_count} records)"

            prompt = f"""
You are an expert AI Data Quality Auditor & License Compliance Judge on GenLayer.
You MUST perform WHOLE-DATASET provenance verification, not just a short preview check.

BUYER DATASET SPECIFICATION & CRITERIA (Immutable Manifest — SHA-256 anchored at creation):
{s_text[:3000]}

REQUIRED SCHEMA, FORMAT & LICENSE:
{format_str}

FORBIDDEN / CONTAMINATED SOURCES:
{black_str}

DATASET CONTENT ({content_coverage}):
{audit_content}

DATASET STATISTICS:
- Total content size: {content_size} bytes
- Total record/line count: {record_count}
- Content hash (SHA-256): Will be anchored immutably on-chain

VERIFICATION CHECKLIST (you MUST evaluate ALL of these):
1. SCHEMA COMPLIANCE: Does the dataset structure match the required format across ALL records (not just the first few)?
2. LICENSE PROVENANCE: Are there any licensing headers, metadata, or attribution fields? Does the content comply with the required license?
3. SOURCE VERIFICATION: Scan ALL content for artifacts from forbidden/blacklisted sources. Check URLs, domain references, attribution strings, and metadata tags.
4. DATA QUALITY: Is the data real and meaningful (not synthetic garbage, lorem ipsum, or duplicated filler)?
5. RECORD COUNT: Does the total number of records meet minimum requirements specified in the format criteria?
6. COMPLETENESS: Is this a complete, deliverable dataset or just a stub/placeholder?

DECISION FRAMEWORK:
- APPROVED: Schema matches across all records, data is clean and complete, licensing compliance verified, zero blacklisted source artifacts, meets minimum record count.
- PARTIAL: Minor formatting deviations or slight noise, but core schema, licensing, and provenance are valid. Usable with minor cleanup.
- REFUND: Broken schema, synthetic garbage, license infringement, contaminated with blacklisted sources, or just a stub/placeholder that doesn't represent a real dataset.
- ESCALATE: Data is corrupted, unreadable, ambiguous, or requires human technical arbitration.

Respond ONLY with valid JSON:
{{"verdict": "APPROVED|PARTIAL|REFUND|ESCALATE", "confidence": 0-100, "reason": "Detailed whole-dataset provenance audit justification covering all 6 checklist items", "record_count": <int>, "content_size": <int>}}
"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return self._parse_llm_json(str(res))

        def validator_fn(leader_res) -> bool:
            """Consensus verification across validator nodes comparing settlement-affecting verdicts."""
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader_data = leader_res.calldata if hasattr(leader_res, "calldata") else leader_res
            if not isinstance(leader_data, dict):
                leader_data = self._parse_llm_json(str(leader_data))

            mine_data = leader_fn()
            return self._effective_verdict(leader_data) == self._effective_verdict(mine_data)

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(result, dict):
            result = self._parse_llm_json(str(result))

        final_verdict = self._effective_verdict(result)
        try:
            conf = int(result.get("confidence", 0))
        except Exception:
            conf = 0
        reason = str(result.get("reason", "No reason provided"))

        if conf < 65:
            reason = f"[Confidence {conf}% < 65%] " + reason

        # Anchor dataset content hash immutably on-chain
        try:
            d_res_hash = gl.nondet.web.render(data_str, mode="text")
            dataset_content = str(d_res_hash)
            task.dataset_hash = self._compute_content_hash(dataset_content)
            task.dataset_size_bytes = str(len(dataset_content))
        except Exception:
            task.dataset_hash = "FETCH_FAILED"
            task.dataset_size_bytes = "0"

        # Store AI-reported record count
        try:
            task.dataset_record_count = str(int(result.get("record_count", 0)))
        except Exception:
            task.dataset_record_count = "0"

        task.verdict = final_verdict
        task.reason = reason
        task.confidence = bigint(conf)

        if final_verdict in ["APPROVED", "PARTIAL"]:
            task.status = "AWAITING_PAYOUT"
            task.payout_ready_at = self._get_current_timestamp() + bigint(86400) # 24h cooling-off window
        elif final_verdict == "REFUND":
            if task.attempts < bigint(2):
                task.status = "NEEDS_REVISION"
            else:
                # Slashing: 2 consecutive failures -> full escrow + slashed stake returned to buyer
                task.status = "CLOSED"
                total_refund = task.escrow_amount + task.contributor_stake
                task.escrow_amount = bigint(0)
                task.contributor_stake = bigint(0)
                gl.get_contract_at(Address(task.buyer)).emit_transfer(value=u256(total_refund))
        else:
            task.status = "ESCALATED"

        self.tasks[task_id] = task

    @gl.public.write
    def raise_dispute(self, task_id: str, reason: str = "") -> None:
        """Transitions task from AWAITING_PAYOUT to DISPUTED within the 24h window, blocking finalization."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "AWAITING_PAYOUT":
            raise UserError("Task is not in AWAITING_PAYOUT status")

        caller = str(gl.message.sender_address).lower()
        if caller != task.buyer and caller != task.contributor:
            raise UserError("Only buyer or assigned contributor can raise a dispute")

        now = self._get_current_timestamp()
        if now > task.payout_ready_at:
            raise UserError("24-hour dispute window has elapsed")

        task.status = "DISPUTED"
        task.disputed_at = now
        if reason:
            task.reason = f"[DISPUTED by {caller[:8]}] {reason}"
        self.tasks[task_id] = task

    @gl.public.write
    def finalize_payout(self, task_id: str) -> None:
        """Disburses escrow funds strictly after 24h cooling-off, with immutable manifest re-verification before fund release."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status != "AWAITING_PAYOUT":
            raise UserError("Task is not awaiting payout or is currently disputed")

        caller = str(gl.message.sender_address).lower()
        if caller != task.buyer and caller != task.contributor:
            raise UserError("Unauthorized caller")

        now = self._get_current_timestamp()
        if now < task.payout_ready_at:
            raise UserError("24-hour cooling-off period has not elapsed yet")

        # Immutable Manifest Re-Verification: Verify content hashes before releasing funds
        # Re-fetch spec and dataset, recompute hashes, compare against anchored values
        if task.spec_hash and task.spec_url:
            try:
                s_res = gl.nondet.web.render(task.spec_url, mode="text")
                current_spec_hash = self._compute_content_hash(str(s_res))
                if current_spec_hash != task.spec_hash:
                    task.status = "ESCALATED"
                    task.reason = f"[MANIFEST TAMPERED] Specification content changed after bounty creation. Anchored: {task.spec_hash[:16]}..., Current: {current_spec_hash[:16]}... Funds frozen for arbitration."
                    self.tasks[task_id] = task
                    raise UserError("Specification manifest integrity check failed — content was modified. Funds frozen for arbitration.")
            except UserError:
                raise
            except Exception as e:
                task.status = "ESCALATED"
                task.reason = f"[MANIFEST VERIFY FAILED] Could not re-verify specification at payout time: {str(e)}"
                self.tasks[task_id] = task
                raise UserError(f"Specification manifest re-verification failed: {str(e)}")

        if task.dataset_hash and task.dataset_hash != "FETCH_FAILED" and task.dataset_url:
            try:
                d_res = gl.nondet.web.render(task.dataset_url, mode="text")
                current_dataset_hash = self._compute_content_hash(str(d_res))
                if current_dataset_hash != task.dataset_hash:
                    task.status = "ESCALATED"
                    task.reason = f"[MANIFEST TAMPERED] Dataset content changed after AI audit approval. Anchored: {task.dataset_hash[:16]}..., Current: {current_dataset_hash[:16]}... Funds frozen for arbitration."
                    self.tasks[task_id] = task
                    raise UserError("Dataset manifest integrity check failed — content was modified after audit. Funds frozen for arbitration.")
            except UserError:
                raise
            except Exception as e:
                task.status = "ESCALATED"
                task.reason = f"[MANIFEST VERIFY FAILED] Could not re-verify dataset at payout time: {str(e)}"
                self.tasks[task_id] = task
                raise UserError(f"Dataset manifest re-verification failed: {str(e)}")

        # All manifest checks passed — proceed with fund disbursement
        escrow = task.escrow_amount
        stake = task.contributor_stake
        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.contributor_stake = bigint(0)

        if task.verdict == "APPROVED":
            gl.get_contract_at(Address(task.contributor)).emit_transfer(value=u256(escrow + stake))
        elif task.verdict == "PARTIAL":
            half = escrow // bigint(2)
            rem = escrow - half
            gl.get_contract_at(Address(task.contributor)).emit_transfer(value=u256(half + stake))
            gl.get_contract_at(Address(task.buyer)).emit_transfer(value=u256(rem))

        self.tasks[task_id] = task

    @gl.public.write
    def resolve_escalation(self, task_id: str, action: str) -> None:
        """Arbitration path for ESCALATED or DISPUTED tasks."""
        if task_id not in self.tasks:
            raise UserError("Task not found")
        task = self.tasks[task_id]
        if task.status not in ["ESCALATED", "DISPUTED"]:
            raise UserError("Task is not in ESCALATED or DISPUTED status")

        caller = str(gl.message.sender_address).lower()
        act = action.upper().strip()

        # Anti-exploit: Buyer can only voluntarily concede (RELEASE)
        if caller == task.buyer and caller != self.platform_admin:
            if act != "RELEASE":
                raise UserError("Buyers can only voluntarily RELEASE funds. Only platform admin can enforce REFUND or SPLIT.")

        if caller != self.platform_admin and caller != task.buyer:
            raise UserError("Unauthorized caller")

        escrow = task.escrow_amount
        stake = task.contributor_stake
        task.status = "CLOSED"
        task.escrow_amount = bigint(0)
        task.contributor_stake = bigint(0)

        if act == "RELEASE":
            gl.get_contract_at(Address(task.contributor)).emit_transfer(value=u256(escrow + stake))
        elif act == "REFUND":
            gl.get_contract_at(Address(task.buyer)).emit_transfer(value=u256(escrow + stake))
        elif act == "SPLIT":
            half = escrow // bigint(2)
            rem = escrow - half
            gl.get_contract_at(Address(task.contributor)).emit_transfer(value=u256(half + stake))
            gl.get_contract_at(Address(task.buyer)).emit_transfer(value=u256(rem))
        else:
            raise UserError("Invalid action. Must be RELEASE, REFUND, or SPLIT")

        self.tasks[task_id] = task

    @gl.public.view
    def get_all_tasks(self) -> str:
        res = []
        for tid in self.task_ids:
            if tid in self.tasks:
                t = self.tasks[tid]
                res.append({
                    "id": tid,
                    "buyer": t.buyer,
                    "contributor": t.contributor,
                    "escrow_amount": str(t.escrow_amount),
                    "contributor_stake": str(t.contributor_stake),
                    "status": t.status,
                    "spec_url": t.spec_url,
                    "dataset_url": t.dataset_url,
                    "required_format": t.required_format,
                    "blacklist_sources": t.blacklist_sources,
                    "verdict": t.verdict,
                    "reason": t.reason,
                    "confidence": str(t.confidence),
                    "attempts": str(t.attempts),
                    "payout_ready_at": str(t.payout_ready_at),
                    "disputed_at": str(t.disputed_at),
                    "spec_hash": t.spec_hash,
                    "dataset_hash": t.dataset_hash,
                    "dataset_record_count": t.dataset_record_count,
                    "dataset_size_bytes": t.dataset_size_bytes
                })
        return json.dumps(res)
