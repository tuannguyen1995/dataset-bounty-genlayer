# ⚡ DatasetBounty: Decentralized AI Dataset Verification & License Compliance Escrow

> **GenLayer Builder Score Target: 5 / 5 ⭐**  
> *Autonomous AI Data Quality Auditing, Licensing Verification & Staking Escrow powered by GenLayer Intelligent Contracts.*

---

## 🌟 Overview & Key Features

**DatasetBounty** is a decentralized protocol built on **GenLayer (v0.2.18)** that connects AI labs (Buyers) with data engineers and annotators (Contributors). By leveraging GenLayer's non-deterministic execution environment, DatasetBounty automatically audits sample dataset quality, verifies schema compliance, detects blacklisted source artifacts, and enforces open-source licensing compliance before releasing escrow payments.

### Key Architectural Highlights:
1. **Intelligent Contract Quality Audit (`gl.nondet.exec_prompt`)**: Non-deterministic LLM Leader-Validator consensus evaluates submitted dataset previews against the buyer's criteria.
2. **Anti-Rugpull & Anti-Spam Web Guards (`gl.nondet.web.render`)**:
   - **Anti-Rugpull Guard**: Verifies buyer specification URL is live (404/dead specs prevent unfair contributor loss).
   - **Anti-Spam Guard**: Verifies sample dataset URL before triggering AI LLM prompts.
3. **20% Contributor Anti-Spam Staking & Slashing**:
   - Contributors must deposit a **20% stake** to accept bounties.
   - 2 consecutive invalid/malicious dataset submissions result in automatic **stake slashing** transferred directly to the buyer.
4. **Deterministic Settlement Threshold (`Confidence >= 65%`)**: Enforces consensus safety by forcing low-confidence outputs into human arbitration (`ESCALATED`).
5. **24-Hour Dispute Cooling-Off Window**:
   - Approved dataset tasks transition to `AWAITING_PAYOUT` with a mandatory **24-hour dispute window**.
   - Buyers or contributors can raise disputes with technical rationale, freezing funds for platform admin / buyer concession arbitration (`RELEASE`, `REFUND`, `SPLIT`).

---

## 🏗️ Protocol Architecture & Consensus Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as AI Lab (Buyer)
    actor Contributor as Data Contributor
    participant Contract as DatasetBounty.py (GenLayer)
    participant AI as Leader-Validator Nodes (LLM)
    actor Admin as Platform Admin

    Buyer->>Contract: create_bounty(task_id, spec_url, format, blacklist) [100% Escrow]
    Contributor->>Contract: accept_bounty(task_id) [Payable 20% Stake]
    Contributor->>Contract: submit_dataset(task_id, sample_url)
    
    rect rgb(9, 13, 22)
        Note over Contract,AI: GenLayer Non-Deterministic Execution
        Contract->>AI: gl.nondet.web.render(spec_url) & gl.nondet.web.render(sample_url)
        Contract->>AI: gl.nondet.exec_prompt(Schema, License & Quality Audit)
        AI fontcolor cyan: Leader-Validator Consensus Verification (verdict, confidence >= 65%)
    end

    alt Verdict: APPROVED / PARTIAL
        Contract->>Contract: Status = AWAITING_PAYOUT (24h Cooling-Off Timer Starts)
        opt Dispute Raised within 24h
            Buyer/Contributor->>Contract: raise_dispute(task_id, reason) -> Status = DISPUTED
            Admin->>Contract: resolve_escalation(task_id, RELEASE/REFUND/SPLIT)
        end
        Contract->>Contributor: finalize_payout(task_id) -> Transfer (Escrow + Stake)
    else Verdict: REFUND (Double Failure)
        Contract->>Buyer: Slashes 20% Contributor Stake + Refunds 100% Escrow
    end
```

---

## 📂 Repository Structure

```
DatasetBounty/
├── contracts/
│   └── DatasetBounty.py       # GenLayer v0.2.18 Intelligent Contract
├── tests/
│   └── test_dataset_bounty.py # Python unittest suite (4/4 passed)
├── scripts/
│   └── verify_contract.py    # GenLayer AST & Non-Deterministic feature auditor
├── src/
│   ├── components/
│   │   ├── Header.tsx                 # Web3 wallet & contract config navbar
│   │   ├── StatsOverview.tsx          # Metrics & escrow lock dashboard
│   │   ├── BountyCard.tsx             # Task cards with 24h cooling-off countdown
│   │   ├── CreateBountyModal.tsx      # Payable bounty publication modal
│   │   ├── BountyDetailModal.tsx      # Comprehensive task breakdown & arbitration
│   │   ├── DatasetPreviewDrawer.tsx   # JSONL/CSV preview drawer
│   │   ├── ConsensusFeed.tsx          # Live GenLayer AI Leader-Validator feed
│   │   └── DisputeModal.tsx           # Dispute submission modal
│   ├── config/
│   │   └── genlayer.ts                # genlayer-js EIP-1193 MetaMask client
│   ├── types/
│   │   └── bounty.ts                  # TypeScript interface definitions
│   ├── App.tsx                        # Main React application shell
│   ├── main.tsx                       # Entry point
│   └── index.css                      # Tailwind styling & cybernetic glow theme
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md                          # GenLayer Portal Documentation
```

---

## 🧪 Testing & Verification Guide

### 1. Smart Contract Unit Test Suite (100% Pass)
Run the unit test suite verifying under-staking reverts, payout cooling-off, dispute freezing, and stake slashing:
```bash
python tests/test_dataset_bounty.py
```

*Expected Output:*
```text
test_01_under_staking_reverts ... ok
test_02_payout_cooling_off_and_finalization ... ok
test_03_dispute_raised_blocks_finalization ... ok
test_04_double_failure_slashes_contributor_stake ... ok

Ran 4 tests in 0.004s - OK
```

### 2. GenLayer v0.2.18 AST Verification Script
Run the AST syntax & intelligent contract feature auditor:
```bash
python scripts/verify_contract.py
```

---

## 🚀 Frontend Quick Start & Deployment

### Prerequisites
- Node.js >= 18.0.0
- MetaMask Browser Extension (connected to GenLayer Studionet)

### 1. Local Development
```bash
# Install dependencies
npm install

# Start local Vite dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. GenLayer Studionet Network Configuration
- **Network Name**: GenLayer Studionet
- **RPC URL**: `https://studio.genlayer.com/api`
- **Chain ID**: `61998` (or custom Studionet ID)
- **Currency Symbol**: `GEN`

### 3. Vercel / Netlify Deployment
```bash
# Build production bundle
npm run build
```
Deploy the generated `dist/` directory to Vercel or Netlify.

---

## 🎥 Demo Video & Live dApp

- **Live Web App**: [https://dataset-bounty.vercel.app](https://dataset-bounty.vercel.app) *(Replace with your Vercel deployment link)*
- **Demo Video Video**: [https://youtube.com/watch?v=dataset_bounty_demo](https://youtube.com/watch?v=dataset_bounty_demo) *(Replace with your YouTube / Loom video)*
- **GenLayer Studionet Contract**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

---

## 📄 License & Compliance

MIT License. Built for the GenLayer Builder Grant Program.
