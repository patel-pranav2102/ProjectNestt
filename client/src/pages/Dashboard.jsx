import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectActiveWorkspace, 
  selectWorkspaces,
  selectWorkspaceStats, 
  setWorkspaceStats,
  setActiveWorkspace
} from '../features/workspaceSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { fetchWorkspaceStats } from '../services/workspaceService.js';
import { 
  Users, Sparkles, FileText, Palette, 
  ClipboardList, CheckCircle2, ArrowRight 
} from 'lucide-react';

const Dashboard = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const workspaces = useSelector(selectWorkspaces);
  const workspaceStats = useSelector(selectWorkspaceStats);

  // Auto-select first workspace if activeWorkspace is null but workspaces are loaded
  useEffect(() => {
    if (!activeWorkspace && workspaces && workspaces.length > 0) {
      dispatch(setActiveWorkspace(workspaces[0]));
    }
  }, [activeWorkspace, workspaces, dispatch]);

  // 1. Fetch Workspace Stats
  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['workspace-stats', activeWorkspace?._id],
    queryFn: () => fetchWorkspaceStats(activeWorkspace._id),
    enabled: !!activeWorkspace?._id,
  });

  useEffect(() => {
    if (statsData?.stats) {
      dispatch(setWorkspaceStats(statsData.stats));
    }
  }, [statsData, dispatch]);

  useEffect(() => {
    if (activeWorkspace?._id) {
      refetch();
    }
  }, [activeWorkspace, refetch]);

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70svh]">
        <div className="p-4 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple mb-4">
          <Sparkles size={36} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white font-display">No Active Workspace Selected</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1.5">
          Select an existing organization workspace or build a new workspace from the switcher at the top to organize your team!
        </p>
      </div>
    );
  }

  const stats = workspaceStats || {
    projectsCount: 0,
    teamsCount: 0,
    membersCount: 0,
    tasks: { total: 0, completed: 0, pending: 0 },
    recentDocuments: [],
    recentDrawings: []
  };

  const taskCompletionRate = stats.tasks.total > 0 
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col gap-6 p-1 md:p-6 text-left max-w-7xl mx-auto overflow-y-auto">
      
      {/* Header Greeting Banner */}
      <header className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/20">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display flex items-center gap-2">
            <span>Welcome back, {currentUser?.name || 'Developer'}!</span>
            <Sparkles size={18} className="text-brand-cyan animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Workspace: <span className="text-white font-semibold">{activeWorkspace.name}</span>. Real-time developer workspace metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            Invite Code: <span className="text-brand-cyan font-mono">{activeWorkspace.inviteCode}</span>
          </span>
        </div>
      </header>

      {/* Grid metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Projects Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/20 border-slate-900/60 transition-transform hover:scale-[1.01]">
          <div className="w-12 h-12 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Projects</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.projectsCount}</h3>
          </div>
        </div>

        {/* Teams Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/20 border-slate-900/60 transition-transform hover:scale-[1.01]">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workspace Teams</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.teamsCount}</h3>
          </div>
        </div>

        {/* Members Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/20 border-slate-900/60 transition-transform hover:scale-[1.01]">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450">
            <Users size={22} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Collaborators</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.membersCount}</h3>
          </div>
        </div>

      </div>

      {/* Progress Chart section */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/20 border-slate-900/60">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sprint Task Progress</h3>
            <p className="text-[11px] text-slate-500">Kanban Board card completion ratios across this workspace.</p>
          </div>
          <span className="text-xs font-bold text-brand-cyan">{taskCompletionRate}% Complete</span>
        </div>

        {/* Progress Bar visualizer */}
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden relative border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-500 rounded-full"
            style={{ width: `${taskCompletionRate}%` }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-purple" />
            <span>Completed Tasks: <strong>{stats.tasks.completed}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span>Pending Tasks: <strong>{stats.tasks.pending}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span>Total Logged Tasks: <strong>{stats.tasks.total}</strong></span>
          </div>
        </div>
      </div>

      {/* Recent activities directory split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recent Documents Column */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/20 border-slate-900/60 text-left">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={16} className="text-brand-purple" />
            <span>Recent Document Notes</span>
          </h3>

          <div className="flex flex-col gap-2">
            {stats.recentDocuments?.map(doc => (
              <a
                key={doc._id}
                href={`/workspace/${activeWorkspace._id}/project/${doc.projectId}/docs`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{doc.title}</p>
                  <span className="text-[10px] text-slate-500">Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
              </a>
            ))}

            {(!stats.recentDocuments || stats.recentDocuments.length === 0) && (
              <p className="text-xs text-slate-600 italic py-2">No documents updated recently.</p>
            )}
          </div>
        </div>

        {/* Recent Whiteboards Column */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/20 border-slate-900/60 text-left">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Palette size={16} className="text-brand-cyan" />
            <span>Recent Whiteboard Sketches</span>
          </h3>

          <div className="flex flex-col gap-2">
            {stats.recentDrawings?.map(draw => (
              <a
                key={draw._id}
                href={`/workspace/${activeWorkspace._id}/project/${draw.projectId}/whiteboard`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{draw.title}</p>
                  <span className="text-[10px] text-slate-500">Updated: {new Date(draw.updatedAt).toLocaleDateString()}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
              </a>
            ))}

            {(!stats.recentDrawings || stats.recentDrawings.length === 0) && (
              <p className="text-xs text-slate-600 italic py-2">No whiteboard sketches saved recently.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
