import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, Clock, AlertTriangle, ExternalLink, 
  CheckCircle2, XCircle, HelpCircle, User, ArrowRight, Eye, ShieldAlert, Zap 
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

  // Calculate 24h cooling off timer
  useEffect(() => {
    if (task.status !== 'AWAITING_PAYOUT' || !task.payout_ready_at || task.payout_ready_at === '0') {
      return;
    }

    const interval = setInterval(() => {
      const nowTs = Math.floor(Date.now() / 1000);
      const readyTs = parseInt(task.payout_ready_at, 10);
      const diff = readyTs - nowTs;

      if (diff <= 0) {
        setTimeLeftStr('Cooling-Off Window Passed - Ready for Payout');
        setIsCoolingOffExpired(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        setTimeLeftStr(`${hours}h ${mins}m ${secs}s remaining`);
        setIsCoolingOffExpired(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [task.status, task.payout_ready_at]);

  // Derived user roles
  const currentUser = (account || '').toLowerCase();
  const isBuyer = currentUser === task.buyer.toLowerCase();
  const isContributor = currentUser === task.contributor.toLowerCase();
  const minStakeRequired = (BigInt(task.escrow_amount || '0') / BigInt(5)).toString();

  // Status Badge Helper
  const getStatusBadge = () => {
    switch (task.status) {
      case 'OPEN':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="bg-violet-500/10 text-violet-300 border border-violet-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />IN PROGRESS</span>;
      case 'NEEDS_REVISION':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />NEEDS REVISION</span>;
      case 'AWAITING_PAYOUT':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />AWAITING PAYOUT</span>;
      case 'DISPUTED':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><ShieldAlert className="w-3 h-3" />DISPUTED</span>;
      case 'ESCALATED':
        return <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><ShieldAlert className="w-3 h-3" />ESCALATED</span>;
      case 'CLOSED':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">CLOSED</span>;
    }
  };

  return (
    <div className="glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
      
      {/* Glow highlight */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider uppercase block mb-1">
              Task ID: {task.id}
            </span>
            <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
              {task.required_format.split(',')[0] || 'AI Dataset Bounty'}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {/* Escrow & Stake Badges */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 rounded-xl p-3 mb-4 border border-slate-800/80 font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Escrow Reward</span>
            <span className="text-lg font-black text-cyan-400">{task.escrow_amount} GEN</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mandatory Stake (20%)</span>
            <span className="text-sm font-bold text-violet-300">
              {task.contributor_stake !== '0' ? `${task.contributor_stake} GEN` : `${minStakeRequired} GEN`}
            </span>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="space-y-2 mb-4 text-xs">
          <div className="flex items-start gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              <strong className="text-slate-200">Required Format:</strong> {task.required_format}
            </span>
          </div>

          {task.blacklist_sources && (
            <div className="flex items-start gap-2 text-rose-300/90">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="line-clamp-1">
                <strong className="text-rose-400">Blacklisted Sources:</strong> {task.blacklist_sources}
              </span>
            </div>
          )}
        </div>

        {/* Verdict & Reason Banner if available */}
        {task.verdict !== 'NONE' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-4 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">GenLayer AI Audit Verdict</span>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                task.verdict === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                task.verdict === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                task.verdict === 'REFUND' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              }`}>
                {task.verdict} ({task.confidence}% Conf.)
              </span>
            </div>
            <p className="text-slate-300 italic line-clamp-2 text-[11px]">
              "{task.reason}"
            </p>
          </div>
        )}

        {/* Cooling-off Countdown Timer */}
        {task.status === 'AWAITING_PAYOUT' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-xs font-mono flex items-center justify-between text-amber-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>24h Dispute Cooling-Off:</span>
            </div>
            <span className="font-bold">{timeLeftStr || 'Calculating...'}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        
        {/* Sample Preview Trigger */}
        {task.dataset_url ? (
          <button
            onClick={() => onOpenPreview(task)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Sample Data</span>
          </button>
        ) : (
          <a
            href={task.spec_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Spec Doc</span>
          </a>
        )}

        {/* Primary Action Buttons depending on role and status */}
        <div className="flex items-center gap-2">
          
          {/* OPEN status -> Accept Bounty */}
          {task.status === 'OPEN' && !isBuyer && (
            <button
              onClick={() => onAccept(task.id, minStakeRequired)}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-cyan-glow transition-all active:scale-95 flex items-center gap-1"
            >
              <span>Accept Task ({minStakeRequired} GEN Stake)</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          {/* IN_PROGRESS / NEEDS_REVISION -> Submit Sample */}
          {(task.status === 'IN_PROGRESS' || task.status === 'NEEDS_REVISION') && (isContributor || !account) && (
            <button
              onClick={() => onSubmitSample(task)}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-violet-glow transition-all active:scale-95 flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Submit Dataset Sample</span>
            </button>
          )}

          {/* AWAITING_PAYOUT -> Raise Dispute button */}
          {task.status === 'AWAITING_PAYOUT' && !isCoolingOffExpired && (isBuyer || isContributor || isAdmin) && (
            <button
              onClick={() => onRaiseDispute(task)}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Raise Dispute</span>
            </button>
          )}

          {/* AWAITING_PAYOUT -> Finalize Payout */}
          {task.status === 'AWAITING_PAYOUT' && isCoolingOffExpired && (isBuyer || isContributor || isAdmin) && (
            <button
              onClick={() => onFinalizePayout(task.id)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-lg hover:brightness-110 transition-all flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finalize Payout</span>
            </button>
          )}

          {/* DISPUTED / ESCALATED -> Arbitration */}
          {(task.status === 'DISPUTED' || task.status === 'ESCALATED') && (isAdmin || isBuyer) && (
            <button
              onClick={() => onResolveEscalation(task)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Arbitrate Resolution</span>
            </button>
          )}

          {/* View Details */}
          <button
            onClick={() => onViewDetails(task)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="View Full Task Breakdown"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

        </div>

      </div>

    </div>
  );
};
