import React from 'react';
import { Database, Lock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DatasetTask } from '../types/bounty';

interface StatsOverviewProps {
  tasks: DatasetTask[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ tasks }) => {
  const totalEscrow = tasks.reduce((sum, t) => sum + Number(t.escrow_amount || 0), 0);
  const activeBounties = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const awaitingPayout = tasks.filter(t => t.status === 'AWAITING_PAYOUT').length;
  const activeDisputes = tasks.filter(t => t.status === 'DISPUTED' || t.status === 'ESCALATED').length;
  const completedBounties = tasks.filter(t => t.status === 'CLOSED').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      
      {/* Total Escrow Locked */}
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-cyan-500 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Escrow</span>
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {totalEscrow.toLocaleString()} <span className="text-sm font-semibold text-cyan-400">GEN</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Escrowed in smart contract</p>
        </div>
      </div>

      {/* Active Bounties */}
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-violet-500 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Bounties</span>
          <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {activeBounties}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Open & In-Progress tasks</p>
        </div>
      </div>

      {/* Pending Payout / Cooling-off */}
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-amber-500 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Cooling-Off</span>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {awaitingPayout}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">24h Dispute window open</p>
        </div>
      </div>

      {/* Disputes / Escalations */}
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-rose-500 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Disputes</span>
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-white tracking-tight text-rose-300">
            {activeDisputes}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {completedBounties} bounties finalized
          </p>
        </div>
      </div>

    </div>
  );
};
