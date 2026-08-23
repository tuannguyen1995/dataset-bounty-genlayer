export type BountyStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_PAYOUT'
  | 'NEEDS_REVISION'
  | 'DISPUTED'
  | 'ESCALATED'
  | 'CLOSED';

export type VerdictType = 'NONE' | 'APPROVED' | 'PARTIAL' | 'REFUND' | 'ESCALATE';

export interface DatasetTask {
  id: string;
  buyer: string;
  contributor: string;
  escrow_amount: string;     // stringified bigint in GEN
  contributor_stake: string; // stringified bigint in GEN
  status: BountyStatus;
  spec_url: string;
  dataset_url: string;
  required_format: string;
  blacklist_sources: string;
  verdict: VerdictType;
  reason: string;
  confidence: string;
  attempts: string;
  payout_ready_at: string;  // unix timestamp string
  disputed_at: string;     // unix timestamp string
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
}
