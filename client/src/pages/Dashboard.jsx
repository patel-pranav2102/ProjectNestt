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
  ClipboardList, CheckCircle2, ArrowRight, Activity
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
  const { data: statsData, refetch } = useQuery({
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[65svh]">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-brand-purple mb-4 shadow-xl">
          <Sparkles size={32} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white font-display tracking-tight">No Active Workspace Selected</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1.5 font-medium">
          Select an existing organization workspace or build a new workspace from the switcher on the left panel!
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
    <div className="flex-1 flex flex-col gap-6 p-1 md:p-4 text-left max-w-7xl mx-auto overflow-y-auto">
      
      {/* Minimalist Header Greeting Banner */}
      <header className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/40 border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">
              Welcome back, {currentUser?.name || 'Developer'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Workspace Overview: <span className="text-slate-200 font-semibold">{activeWorkspace.name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 shadow-inner flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Invite Code:</span>
            <span className="text-brand-cyan font-mono font-bold tracking-wider">{activeWorkspace.inviteCode}</span>
          </div>
        </div>
      </header>

      {/* Grid metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Projects Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/30 border-slate-800/80 transition-all hover:border-slate-700 hover:shadow-2xl">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ClipboardList size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Projects</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.projectsCount}</h3>
          </div>
        </div>

        {/* Teams Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/30 border-slate-800/80 transition-all hover:border-slate-700 hover:shadow-2xl">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workspace Teams</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.teamsCount}</h3>
          </div>
        </div>

        {/* Members Card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 bg-slate-950/30 border-slate-800/80 transition-all hover:border-slate-700 hover:shadow-2xl">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Collaborators</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{stats.membersCount}</h3>
          </div>
        </div>

      </div>

      {/* Minimalist Sprint Progress Section */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/30 border-slate-800/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-brand-purple" />
              <span>Sprint Task Progress</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kanban Board completion metrics across active projects.</p>
          </div>
          <span className="text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
            {taskCompletionRate}% Complete
          </span>
        </div>

        {/* Minimalist Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden relative border border-slate-800/80 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-500 rounded-full"
            style={{ width: `${taskCompletionRate}%` }}
          />
        </div>

        {/* Minimal Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 mt-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-purple" />
            <span>Completed Tasks: <strong className="text-slate-200">{stats.tasks.completed}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Pending Tasks: <strong className="text-slate-200">{stats.tasks.pending}</strong></span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-slate-500 font-medium">
            <span>Total Logged Tasks: <strong className="text-slate-300">{stats.tasks.total}</strong></span>
          </div>
        </div>
      </div>

      {/* Recent activities directory split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Recent Documents Column */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/30 border-slate-800/80 text-left">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText size={15} className="text-brand-purple" />
            <span>Recent Documents</span>
          </h3>

          <div className="flex flex-col gap-2">
            {stats.recentDocuments?.map(doc => (
              <a
                key={doc._id}
                href={`/workspace/${activeWorkspace._id}/project/${doc.projectId}/docs`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/70 hover:border-slate-700 transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{doc.title}</p>
                  <span className="text-[10px] text-slate-500 font-medium">Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all shrink-0" />
              </a>
            ))}

            {(!stats.recentDocuments || stats.recentDocuments.length === 0) && (
              <p className="text-xs text-slate-500 italic py-3 text-center">No recent documents created yet.</p>
            )}
          </div>
        </div>

        {/* Recent Whiteboards Column */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 bg-slate-950/30 border-slate-800/80 text-left">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palette size={15} className="text-brand-cyan" />
            <span>Recent Whiteboards</span>
          </h3>

          <div className="flex flex-col gap-2">
            {stats.recentDrawings?.map(draw => (
              <a
                key={draw._id}
                href={`/workspace/${activeWorkspace._id}/project/${draw.projectId}/whiteboard`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/70 hover:border-slate-700 transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{draw.title}</p>
                  <span className="text-[10px] text-slate-500 font-medium">Updated: {new Date(draw.updatedAt).toLocaleDateString()}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all shrink-0" />
              </a>
            ))}

            {(!stats.recentDrawings || stats.recentDrawings.length === 0) && (
              <p className="text-xs text-slate-500 italic py-3 text-center">No recent whiteboards saved yet.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
