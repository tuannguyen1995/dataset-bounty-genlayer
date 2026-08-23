import React, { useState } from 'react';
import { 
  Database, ShieldCheck, Clock, ExternalLink, CheckCircle2, 
  XCircle, AlertTriangle, ShieldAlert, X, Eye, Zap, RefreshCw, Send 
} from 'lucide-react';
import { DatasetTask } from '../types/bounty';

interface BountyDetailModalProps {
  task: DatasetTask | null;
  account: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onSubmitDataset: (taskId: string, datasetUrl: string) => Promise<void>;
  onRaiseDispute: (task: DatasetTask) => void;
  onFinalizePayout: (taskId: string) => Promise<void>;
  onResolveEscalation: (taskId: string, action: 'RELEASE' | 'REFUND' | 'SPLIT') => Promise<void>;
  onOpenPreview: (task: DatasetTask) => void;
  isLoading: boolean;
}

export const BountyDetailModal: React.FC<BountyDetailModalProps> = ({
  task,
  account,
  isAdmin,
  onClose,
  onSubmitDataset,
  onRaiseDispute,
  onFinalizePayout,
  onResolveEscalation,
  onOpenPreview,
  isLoading
}) => {
  const [datasetUrlInput, setDatasetUrlInput] = useState(
    'https://raw.githubusercontent.com/datasets/samples/python_eval_sample.jsonl'
  );
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  if (!task) return null;

  const currentUser = (account || '').toLowerCase();
  const isBuyer = currentUser === task.buyer.toLowerCase();
  const isContributor = currentUser === task.contributor.toLowerCase();

  const handleDatasetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetUrlInput.trim()) return;
    await onSubmitDataset(task.id, datasetUrlInput.trim());
    setShowSubmitForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
              Bounty Task Details & Governance
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">{task.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase">Escrow Reward</span>
            <div className="text-base font-extrabold text-cyan-400">{task.escrow_amount} GEN</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase">Contributor Stake</span>
            <div className="text-base font-extrabold text-violet-300">{task.contributor_stake} GEN</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase">Status</span>
            <div className="text-xs font-bold text-white mt-1">{task.status}</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase">Attempts</span>
            <div className="text-base font-extrabold text-amber-400">{task.attempts} / 2</div>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Buyer Address:</span>
            <span className="text-cyan-300 font-bold">{task.buyer}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Contributor Address:</span>
            <span className="text-violet-300 font-bold">
              {task.contributor === '0x0000000000000000000000000000000000000000' ? 'None (Open Bounty)' : task.contributor}
            </span>
          </div>
        </div>

        {/* Specification & Format Criteria */}
        <div className="space-y-3 mb-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Dataset Spec URL</span>
            <a
              href={task.spec_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 break-all"
            >
              {task.spec_url}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Required Schema & License</span>
            <p className="text-white">{task.required_format}</p>
          </div>

          {task.blacklist_sources && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
              <span className="text-[10px] text-rose-400 uppercase block font-bold mb-1">Forbidden Source Filters</span>
              <p>{task.blacklist_sources}</p>
            </div>
          )}
        </div>

        {/* AI Audit Verdict breakdown if present */}
        {task.verdict !== 'NONE' && (
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 mb-5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase">GenLayer Consensus Audit Result</span>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                {task.verdict} ({task.confidence}% Confidence)
              </span>
            </div>
            <p className="text-slate-200 bg-slate-950 p-3 rounded-lg text-[11px] leading-relaxed border border-slate-800">
              {task.reason}
            </p>
          </div>
        )}

        {/* Submit Dataset Form for Contributor */}
        {(task.status === 'IN_PROGRESS' || task.status === 'NEEDS_REVISION') && (
          <div className="bg-slate-900 border border-violet-500/40 rounded-xl p-4 mb-5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-violet-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-violet-400" />
                Submit Dataset Sample URL
              </span>
              <span className="text-[10px] text-amber-400">Attempt #{Number(task.attempts) + 1}</span>
            </div>

            <form onSubmit={handleDatasetSubmit} className="space-y-3 mt-3">
              <input
                type="url"
                value={datasetUrlInput}
                onChange={(e) => setDatasetUrlInput(e.target.value)}
                placeholder="https://storage.io/sample.jsonl"
                className="w-full bg-slate-950 border border-slate-700 focus:border-violet-400 rounded-lg px-3 py-2 text-white outline-none"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-bold py-2.5 rounded-lg shadow-violet-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Trigger GenLayer AI Quality Audit</span>
              </button>
            </form>
          </div>
        )}

        {/* Arbitration Controls (DISPUTED or ESCALATED) */}
        {(task.status === 'DISPUTED' || task.status === 'ESCALATED') && (isAdmin || isBuyer) && (
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 mb-5 text-xs">
            <h4 className="font-bold text-amber-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Escalation Arbitration Panel
            </h4>
            <p className="text-slate-300 text-[11px] mb-3">
              {isAdmin ? "Admin can release funds to contributor, issue a full refund to buyer, or split escrow 50/50." : "Buyer can voluntarily concession & RELEASE funds to contributor."}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onResolveEscalation(task.id, 'RELEASE')}
                disabled={isLoading}
                className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 py-2 rounded-lg font-bold text-center transition-all disabled:opacity-50"
              >
                RELEASE (100% Contributor)
              </button>

              {(isAdmin) && (
                <>
                  <button
                    onClick={() => onResolveEscalation(task.id, 'REFUND')}
                    disabled={isLoading}
                    className="bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 py-2 rounded-lg font-bold text-center transition-all disabled:opacity-50"
                  >
                    REFUND (100% Buyer)
                  </button>
                  <button
                    onClick={() => onResolveEscalation(task.id, 'SPLIT')}
                    disabled={isLoading}
                    className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/50 py-2 rounded-lg font-bold text-center transition-all disabled:opacity-50"
                  >
                    SPLIT (50/50)
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          {task.dataset_url && (
            <button
              onClick={() => onOpenPreview(task)}
              className="flex items-center gap-1 text-cyan-400 hover:underline text-xs font-bold"
            >
              <Eye className="w-4 h-4" />
              <span>Open Data Previewer</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all ml-auto"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
