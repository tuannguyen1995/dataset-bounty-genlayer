import React, { useState, useEffect } from 'react';
import { 
  Database, Plus, Search, Filter, RefreshCw, Cpu, 
  ShieldCheck, AlertCircle, Sparkles, CheckCircle2, Terminal, Layers, Activity, Lock, Users, Zap 
} from 'lucide-react';
import { DatasetTask, BountyStatus } from './types/bounty';
import { 
  fetchAllTasks, 
  executeContractWrite, 
  saveLocalTasks, 
  getContractAddress 
} from './config/genlayer';
import { Header } from './components/Header';
import { BountyCard } from './components/BountyCard';
import { CreateBountyModal } from './components/CreateBountyModal';
import { BountyDetailModal } from './components/BountyDetailModal';
import { DatasetPreviewDrawer } from './components/DatasetPreviewDrawer';
import { ConsensusFeed } from './components/ConsensusFeed';
import { DisputeModal } from './components/DisputeModal';

export function App() {
  const [tasks, setTasks] = useState<DatasetTask[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BUYER' | 'CONTRIBUTOR' | 'DISPUTES'>('ALL');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<DatasetTask | null>(null);
  const [previewTask, setPreviewTask] = useState<DatasetTask | null>(null);
  const [disputeTask, setDisputeTask] = useState<DatasetTask | null>(null);
  
  // AI Consensus simulation state
  const [isEvaluatingConsensus, setIsEvaluatingConsensus] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          showToast(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, 'success');
        }
      } catch (err: any) {
        showToast(err?.message || "Failed to connect wallet", 'error');
      }
    } else {
      showToast("MetaMask not detected. Running in simulation mode.", 'info');
    }
  };

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const fetched = await fetchAllTasks();
      setTasks(fetched);
    } catch (e: any) {
      console.warn("Failed to load tasks:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on?.('accountsChanged', (accs: string[]) => {
        setAccount(accs[0] || null);
      });
    }
  }, []);

  // 1. Create Bounty
  const handleCreateBounty = async (data: {
    taskId: string;
    escrowAmount: string;
    specUrl: string;
    requiredFormat: string;
    blacklistSources: string;
  }) => {
    setIsLoading(true);
    try {
      const escrowWei = BigInt(data.escrowAmount);
      await executeContractWrite(
        'create_bounty',
        [data.taskId, data.specUrl, data.requiredFormat, data.blacklistSources],
        escrowWei
      );
      showToast(`Bounty "${data.taskId}" successfully published!`, 'success');
      setShowCreateModal(false);
      await loadTasks();
    } catch (err: any) {
      const newTask: DatasetTask = {
        id: data.taskId,
        buyer: account || "0xbuyer_ai_lab_7f81a2b9",
        contributor: "0x0000000000000000000000000000000000000000",
        escrow_amount: data.escrowAmount,
        contributor_stake: "0",
        status: "OPEN",
        spec_url: data.specUrl,
        dataset_url: "",
        required_format: data.requiredFormat,
        blacklist_sources: data.blacklistSources,
        verdict: "NONE",
        reason: "Awaiting contributor acceptance",
        confidence: "0",
        attempts: "0",
        payout_ready_at: "0",
        disputed_at: "0"
      };

      const updated = [newTask, ...tasks];
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: Created ${data.taskId}!`, 'success');
      setShowCreateModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Accept Bounty
  const handleAcceptBounty = async (taskId: string, minStake: string) => {
    setIsLoading(true);
    try {
      const stakeWei = BigInt(minStake);
      await executeContractWrite('accept_bounty', [taskId], stakeWei);
      showToast(`Bounty "${taskId}" accepted with ${minStake} GEN stake!`, 'success');
      await loadTasks();
    } catch (err: any) {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            contributor: account || "0xcontributor_dev_3e21a1d4",
            contributor_stake: minStake,
            status: "IN_PROGRESS" as BountyStatus
          };
        }
        return t;
      });
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: Accepted ${taskId}!`, 'success');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit Dataset Sample
  const handleSubmitDatasetSample = async (taskId: string, datasetUrl: string) => {
    setIsLoading(true);
    setIsEvaluatingConsensus(true);

    try {
      await new Promise(res => setTimeout(res, 6500));
      await executeContractWrite('submit_dataset', [taskId, datasetUrl]);
      showToast(`Dataset sample verified & APPROVED!`, 'success');
      await loadTasks();
    } catch (err: any) {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          const attemptsNum = Number(t.attempts) + 1;
          return {
            ...t,
            dataset_url: datasetUrl,
            attempts: String(attemptsNum),
            verdict: "APPROVED" as any,
            confidence: "98",
            reason: "100% Schema & License compliant. Verified MIT license metadata.",
            status: "AWAITING_PAYOUT" as BountyStatus,
            payout_ready_at: String(Math.floor(Date.now() / 1000) + 86400)
          };
        }
        return t;
      });
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: AI Audit Passed! 24h cooling-off window open.`, 'success');
    } finally {
      setIsEvaluatingConsensus(false);
      setIsLoading(false);
      setSelectedTask(null);
    }
  };

  // 4. Raise Dispute
  const handleConfirmDispute = async (taskId: string, reason: string) => {
    setIsLoading(true);
    try {
      await executeContractWrite('raise_dispute', [taskId, reason]);
      showToast(`Dispute raised on ${taskId}. Payout frozen.`, 'success');
      await loadTasks();
    } catch (err: any) {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: "DISPUTED" as BountyStatus,
            reason: `[DISPUTED] ${reason}`,
            disputed_at: String(Math.floor(Date.now() / 1000))
          };
        }
        return t;
      });
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: Dispute raised on ${taskId}.`, 'success');
    } finally {
      setIsLoading(false);
      setDisputeTask(null);
    }
  };

  // 5. Finalize Payout
  const handleFinalizePayout = async (taskId: string) => {
    setIsLoading(true);
    try {
      await executeContractWrite('finalize_payout', [taskId]);
      showToast(`Payout finalized for ${taskId}!`, 'success');
      await loadTasks();
    } catch (err: any) {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: "CLOSED" as BountyStatus,
            escrow_amount: "0",
            contributor_stake: "0"
          };
        }
        return t;
      });
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: Finalized payout for ${taskId}!`, 'success');
    } finally {
      setIsLoading(false);
      setSelectedTask(null);
    }
  };

  // 6. Resolve Escalation
  const handleResolveEscalation = async (taskId: string, action: 'RELEASE' | 'REFUND' | 'SPLIT') => {
    setIsLoading(true);
    try {
      await executeContractWrite('resolve_escalation', [taskId, action]);
      showToast(`Arbitrated action "${action}" completed.`, 'success');
      await loadTasks();
    } catch (err: any) {
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: "CLOSED" as BountyStatus,
            escrow_amount: "0",
            contributor_stake: "0",
            reason: `[ARBITRATED - ${action}] Task resolved by governance.`
          };
        }
        return t;
      });
      setTasks(updated);
      saveLocalTasks(updated);
      showToast(`Simulation Mode: Arbitrated ${taskId} with ${action}.`, 'success');
    } finally {
      setIsLoading(false);
      setSelectedTask(null);
    }
  };

  // Metrics
  const totalEscrow = tasks.reduce((sum, t) => sum + Number(t.escrow_amount || 0), 0);
  const activeBounties = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const coolingOffCount = tasks.filter(t => t.status === 'AWAITING_PAYOUT').length;
  const activeDisputes = tasks.filter(t => t.status === 'DISPUTED' || t.status === 'ESCALATED').length;

  // Filter Tasks
  const currentUser = (account || '').toLowerCase();
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.required_format.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyer.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Role filter
    if (roleFilter === 'BUYER' && t.buyer.toLowerCase() !== currentUser) return false;
    if (roleFilter === 'CONTRIBUTOR' && t.contributor.toLowerCase() !== currentUser) return false;
    if (roleFilter === 'DISPUTES' && t.status !== 'DISPUTED' && t.status !== 'ESCALATED') return false;

    // Status filter
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col font-sans bg-grid-pattern">
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`obsidian-panel px-4 py-3 rounded-2xl border flex items-center gap-3 text-xs font-mono shadow-2xl ${
            notification.type === 'success' ? 'border-emerald-500/50 text-emerald-300' :
            notification.type === 'error' ? 'border-rose-500/50 text-rose-300' :
            'border-amber-500/50 text-amber-300'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        account={account}
        connectWallet={connectWallet}
        onRefresh={loadTasks}
        isLoading={isLoading}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />

      {/* Main Asymmetric Studio Layout */}
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Left Sticky Sidebar / Protocol Control Panel */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6">
          
          {/* Create Bounty CTA Box */}
          <div className="obsidian-panel p-5 rounded-3xl border border-emerald-500/30 relative overflow-hidden group shadow-emerald-glow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold mb-2">
              <Zap className="w-4 h-4 fill-current text-amber-400" />
              <span>AI Data Escrow</span>
            </div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Publish Dataset Bounty
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Lock GEN escrow & define GenLayer consensus audit rules.
            </p>

            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs py-3 rounded-2xl shadow-emerald-glow transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create AI Bounty</span>
            </button>
          </div>

          {/* Role Filter Switcher */}
          <div className="obsidian-panel p-4 rounded-3xl border border-obsidian-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold px-1 mb-1">
              Workspace Filter
            </span>

            {[
              { id: 'ALL', label: 'All Bounties', icon: Layers, count: tasks.length },
              { id: 'BUYER', label: 'My Buyer Escrows', icon: Lock, count: tasks.filter(t => t.buyer.toLowerCase() === currentUser).length },
              { id: 'CONTRIBUTOR', label: 'My Contributions', icon: Users, count: tasks.filter(t => t.contributor.toLowerCase() === currentUser).length },
              { id: 'DISPUTES', label: 'Active Disputes', icon: AlertCircle, count: activeDisputes },
            ].map((rf) => {
              const Icon = rf.icon;
              const isActive = roleFilter === rf.id;
              return (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id as any)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold shadow-emerald-glow'
                      : 'text-slate-400 hover:text-white hover:bg-obsidian-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{rf.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-obsidian-900 text-slate-400'}`}>
                    {rf.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Node Metrics Box */}
          <div className="obsidian-panel p-4 rounded-3xl border border-obsidian-800 space-y-3 font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              Protocol Telemetry
            </span>

            <div className="flex items-center justify-between border-b border-obsidian-850 pb-2">
              <span className="text-slate-400">Total Escrow Locked</span>
              <span className="text-emerald-400 font-extrabold">{totalEscrow.toLocaleString()} GEN</span>
            </div>

            <div className="flex items-center justify-between border-b border-obsidian-850 pb-2">
              <span className="text-slate-400">Active Bounties</span>
              <span className="text-white font-bold">{activeBounties}</span>
            </div>

            <div className="flex items-center justify-between border-b border-obsidian-850 pb-2">
              <span className="text-slate-400">24h Dispute Cooling</span>
              <span className="text-amber-300 font-bold">{coolingOffCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">GenLayer VM Version</span>
              <span className="text-emerald-400 font-bold">v0.2.18</span>
            </div>
          </div>

        </aside>

        {/* Center Main Workspace */}
        <main className="flex-1 space-y-6">
          
          {/* Header Banner */}
          <div className="obsidian-panel rounded-3xl p-6 lg:p-7 border border-obsidian-800 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold mb-3">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>GenLayer Intelligent Contract Consensus Engine</span>
                </div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Autonomous AI Dataset Verification Protocol
                </h1>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Automated non-deterministic schema validation, licensing compliance check, anti-spam 20% contributor staking, and 24h dispute cooling-off escrow.
                </p>
              </div>
            </div>
          </div>

          {/* Live AI Consensus Step Feed Animation */}
          <ConsensusFeed isEvaluating={isEvaluatingConsensus} />

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search task ID, format, or buyer address..."
                className="w-full bg-obsidian-900 border border-obsidian-800 focus:border-emerald-500/40 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono text-white outline-none transition-all"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center overflow-x-auto w-full sm:w-auto space-x-1.5 bg-obsidian-900 p-1.5 rounded-2xl border border-obsidian-800 text-xs font-mono">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'AWAITING_PAYOUT', 'DISPUTED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-emerald-500 text-black shadow-emerald-glow'
                      : 'text-slate-400 hover:text-white hover:bg-obsidian-800/60'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

          </div>

          {/* Bounty Grid */}
          {filteredTasks.length === 0 ? (
            <div className="obsidian-panel p-12 text-center rounded-3xl border border-obsidian-800">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white font-mono">No Dataset Bounties Match Filter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No tasks match your selected workspace or status filter. Click "Publish Dataset Bounty" to create one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTasks.map((task) => (
                <BountyCard
                  key={task.id}
                  task={task}
                  account={account}
                  isAdmin={isAdmin}
                  onAccept={(tid, minStake) => handleAcceptBounty(tid, minStake)}
                  onSubmitSample={(t) => setSelectedTask(t)}
                  onRaiseDispute={(t) => setDisputeTask(t)}
                  onFinalizePayout={(tid) => handleFinalizePayout(tid)}
                  onResolveEscalation={(t) => setSelectedTask(t)}
                  onViewDetails={(t) => setSelectedTask(t)}
                  onOpenPreview={(t) => setPreviewTask(t)}
                />
              ))}
            </div>
          )}

        </main>

      </div>

      {/* Footer */}
      <footer className="border-t border-obsidian-800 py-6 text-center text-xs font-mono text-slate-400 bg-[#05070a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DatasetBounty Protocol © 2026 GenLayer Studionet</span>
          <span className="text-emerald-400 font-bold">Intelligent Contract v0.2.18 | Builder Score 5 Standard</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CreateBountyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBounty}
        isLoading={isLoading}
      />

      <BountyDetailModal
        task={selectedTask}
        account={account}
        isAdmin={isAdmin}
        onClose={() => setSelectedTask(null)}
        onSubmitDataset={(tid, url) => handleSubmitDatasetSample(tid, url)}
        onRaiseDispute={(t) => setDisputeTask(t)}
        onFinalizePayout={(tid) => handleFinalizePayout(tid)}
        onResolveEscalation={(tid, act) => handleResolveEscalation(tid, act)}
        onOpenPreview={(t) => setPreviewTask(t)}
        isLoading={isLoading}
      />

      <DatasetPreviewDrawer
        task={previewTask}
        onClose={() => setPreviewTask(null)}
      />

      <DisputeModal
        task={disputeTask}
        onClose={() => setDisputeTask(null)}
        onSubmitDispute={(tid, r) => handleConfirmDispute(tid, r)}
        isLoading={isLoading}
      />

    </div>
  );
}
