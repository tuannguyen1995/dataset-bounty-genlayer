import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Clock, AlertTriangle, ExternalLink, 
  CheckCircle2, XCircle, User, ArrowRight, Eye, ShieldAlert, Zap, Layers 
} from 'lucide-react';
import { DatasetTask } from '../types/bounty';

interface BountyCardProps {
  task: DatasetTask;
  account: string | null;
  isAdmin: boolean;
  onAccept: (taskId: string, stakeAmount: string) => void;
  onSubmitSample: (task: DatasetTask) => void;
  onRaiseDispute: (task: DatasetTask) => void;
  onFinalizePayout: (taskId: string) => void;
  onResolveEscalation: (task: DatasetTask) => void;
  onViewDetails: (task: DatasetTask) => void;
  onOpenPreview: (task: DatasetTask) => void;
}

export const BountyCard: React.FC<BountyCardProps> = ({
  task,
  account,
  isAdmin,
  onAccept,
  onSubmitSample,
  onRaiseDispute,
  onFinalizePayout,
  onResolveEscalation,
  onViewDetails,
  onOpenPreview,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isCoolingOffExpired, setIsCoolingOffExpired] = useState<boolean>(false);

  useEffect(() => {
    if (task.status !== 'AWAITING_PAYOUT' || !task.payout_ready_at || task.payout_ready_at === '0') {
      return;
    }

    const interval = setInterval(() => {
      const nowTs = Math.floor(Date.now() / 1000);
      const readyTs = parseInt(task.payout_ready_at, 10);
      const diff = readyTs - nowTs;

      if (diff <= 0) {
        setTimeLeftStr('24h Window Cleared');
        setIsCoolingOffExpired(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        setTimeLeftStr(`${hours}h ${mins}m ${secs}s`);
        setIsCoolingOffExpired(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [task.status, task.payout_ready_at]);

  const currentUser = (account || '').toLowerCase();
  const isBuyer = currentUser === task.buyer.toLowerCase();
  const isContributor = currentUser === task.contributor.toLowerCase();
  const minStakeRequired = (BigInt(task.escrow_amount || '0') / BigInt(5)).toString();

  const getStatusBadge = () => {
    switch (task.status) {
      case 'OPEN':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-400" />IN PROGRESS</span>;
      case 'NEEDS_REVISION':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />REVISION</span>;
      case 'AWAITING_PAYOUT':
        return <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-400" />AWAITING PAYOUT</span>;
      case 'DISPUTED':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><ShieldAlert className="w-3 h-3" />DISPUTED</span>;
      case 'ESCALATED':
        return <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><ShieldAlert className="w-3 h-3" />ESCALATED</span>;
      case 'CLOSED':
        return <span className="bg-obsidian-800 text-slate-400 border border-obsidian-700 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">CLOSED</span>;
    }
  };

  return (
    <div className="obsidian-card rounded-3xl p-5 flex flex-col justify-between relative group overflow-hidden">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />

      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                ID: {task.id}
              </span>
              {task.attempts !== '0' && (
                <span className="text-[10px] font-mono text-slate-400 bg-obsidian-900 border border-obsidian-800 px-1.5 py-0.5 rounded">
                  Attempt #{task.attempts}/2
                </span>
              )}
              {task.spec_hash && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded" title={`Spec SHA-256: ${task.spec_hash}`}>
                  🔒 Manifest
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
              {task.required_format.split(',')[0] || 'AI Dataset Bounty'}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {/* Escrow & Stake Header Bar */}
        <div className="bg-obsidian-900/90 rounded-2xl p-3.5 mb-4 border border-obsidian-800 font-mono">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Escrow Reward</span>
              <span className="text-xl font-black text-emerald-400 tracking-tight">{task.escrow_amount} GEN</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mandatory 20% Stake</span>
              <span className="text-sm font-bold text-amber-300">
                {task.contributor_stake !== '0' ? `${task.contributor_stake} GEN` : `${minStakeRequired} GEN`}
              </span>
            </div>
          </div>
          
          {/* Visual Stake Ratio Bar */}
          <div className="w-full bg-obsidian-850 h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: '80%' }} title="80% Escrow Pool" />
            <div className="bg-amber-400 h-full" style={{ width: '20%' }} title="20% Mandatory Contributor Stake" />
          </div>
        </div>

        {/* Format Spec & Blacklisted filters */}
        <div className="space-y-2 mb-4 text-xs font-sans">
          <div className="bg-obsidian-950/60 p-2.5 rounded-xl border border-obsidian-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold mb-0.5">Required Schema & License</span>
            <p className="text-slate-200 line-clamp-2 leading-relaxed text-[11px]">
              {task.required_format}
            </p>
          </div>

          {task.blacklist_sources && (
            <div className="flex items-center gap-1.5 text-rose-300 text-[11px]">
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="line-clamp-1">
                <strong className="text-rose-400 font-mono">Forbidden:</strong> {task.blacklist_sources}
              </span>
            </div>
          )}
        </div>

        {/* AI Audit Verdict Pill if available */}
        {task.verdict !== 'NONE' && (
          <div className="bg-obsidian-950/80 border border-obsidian-800 rounded-2xl p-3 mb-4 text-xs font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">GenLayer Audit Score</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                task.verdict === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                task.verdict === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                task.verdict === 'REFUND' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {task.verdict} ({task.confidence}% Conf.)
              </span>
            </div>
            <p className="text-slate-300 italic line-clamp-2 text-[11px] pt-1">
              "{task.reason}"
            </p>
          </div>
        )}

        {/* 24h Dispute Cooling-Off Timer Banner */}
        {task.status === 'AWAITING_PAYOUT' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-4 text-xs font-mono flex items-center justify-between text-amber-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Dispute Window:</span>
            </div>
            <span className="font-bold text-amber-200">{timeLeftStr || 'Calculating...'}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-obsidian-800 flex items-center justify-between gap-2">
        
        {/* Sample Preview Trigger */}
        {task.dataset_url ? (
          <button
            onClick={() => onOpenPreview(task)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono font-bold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Sample Stream</span>
          </button>
        ) : (
          <a
            href={task.spec_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-mono transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Spec Doc</span>
          </a>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* OPEN status -> Accept Bounty */}
          {task.status === 'OPEN' && !isBuyer && (
            <button
              onClick={() => onAccept(task.id, minStakeRequired)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-emerald-glow transition-all active:scale-95 flex items-center gap-1"
            >
              <span>Accept ({minStakeRequired} GEN)</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          {/* IN_PROGRESS / NEEDS_REVISION -> Submit Sample */}
          {(task.status === 'IN_PROGRESS' || task.status === 'NEEDS_REVISION') && (isContributor || !account) && (
            <button
              onClick={() => onSubmitSample(task)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-indigo-glow transition-all active:scale-95 flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>Submit Sample</span>
            </button>
          )}

          {/* AWAITING_PAYOUT -> Raise Dispute button */}
          {task.status === 'AWAITING_PAYOUT' && !isCoolingOffExpired && (isBuyer || isContributor || isAdmin) && (
            <button
              onClick={() => onRaiseDispute(task)}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Raise Dispute</span>
            </button>
          )}

          {/* AWAITING_PAYOUT -> Finalize Payout */}
          {task.status === 'AWAITING_PAYOUT' && isCoolingOffExpired && (isBuyer || isContributor || isAdmin) && (
            <button
              onClick={() => onFinalizePayout(task.id)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finalize Payout</span>
            </button>
          )}

          {/* DISPUTED / ESCALATED -> Arbitration */}
          {(task.status === 'DISPUTED' || task.status === 'ESCALATED') && (isAdmin || isBuyer) && (
            <button
              onClick={() => onResolveEscalation(task)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Arbitrate</span>
            </button>
          )}

          {/* Inspect Details */}
          <button
            onClick={() => onViewDetails(task)}
            className="p-1.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-slate-400 hover:text-white transition-colors"
            title="Inspect Task Details"
          >
            <Layers className="w-4 h-4" />
          </button>

        </div>

      </div>

    </div>
  );
};
