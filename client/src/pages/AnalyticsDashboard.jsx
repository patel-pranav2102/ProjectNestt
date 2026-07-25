import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  BarChart2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  Users,
  Briefcase,
  Tag
} from 'lucide-react';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { fetchWorkspaceAnalytics } from '../services/analyticsService.js';

const AnalyticsDashboard = () => {
  const { workspaceId } = useParams();
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const wId = workspaceId || activeWorkspace?._id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace-analytics', wId],
    queryFn: () => fetchWorkspaceAnalytics(wId),
    enabled: !!wId,
  });

  const stats = data?.analytics;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[82svh]">
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-3 h-3 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-3 h-3 rounded-full bg-brand-purple animate-bounce"></span>
        </div>
        <p className="text-slate-400 text-xs mt-4">Loading workspace analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[82svh] p-6 text-center">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 mb-4 border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">Failed to load analytics</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          There was an error retrieving the data for this workspace. Please try again later.
        </p>
      </div>
    );
  }

  // Label color picker
  const getLabelStyle = (index) => {
    const styles = [
      'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
      'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'bg-pink-500/10 text-pink-400 border-pink-500/20'
    ];
    return styles[index % styles.length];
  };

  const maxStatusCount = Math.max(...stats.cardsByStatus.map(s => s.count), 1);
  const maxAssigneeCount = Math.max(...stats.topAssignees.map(a => a.count), 1);

  return (
    <div className="flex-1 flex flex-col gap-6 p-1 md:p-6 text-left h-[82svh] overflow-y-auto scrollbar-thin">
      
      {/* Page Header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
          <BarChart2 size={20} className="text-brand-purple" />
          Analytics & Reports
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Workspace insights, project metrics, and member activity.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cards */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between hover:border-slate-700/60 transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Cards</span>
            <span className="text-2xl font-bold text-white">{stats.totalCards}</span>
          </div>
          <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-xl border border-brand-purple/20">
            <Layers size={18} />
          </div>
        </div>

        {/* Done Cards */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between hover:border-slate-700/60 transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Completed Cards</span>
            <span className="text-2xl font-bold text-white">{stats.doneCards}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Overdue Cards */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between hover:border-slate-700/60 transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overdue Cards</span>
            <span className="text-2xl font-bold text-rose-400">{stats.overdueCount}</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <AlertCircle size={18} />
          </div>
        </div>

        {/* Completed This Week */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 flex items-center justify-between hover:border-slate-700/60 transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Done (7 Days)</span>
            <span className="text-2xl font-bold text-brand-cyan">{stats.completedThisWeek}</span>
          </div>
          <div className="p-3 bg-brand-cyan/10 text-brand-cyan rounded-xl border border-brand-cyan/20">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Grid of Main Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution (Horizontal Bar Chart) */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Cards by Status</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Distribution of cards across workflow stages.</p>
          </div>

          {stats.cardsByStatus.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-600 text-xs">
              No status data available.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.cardsByStatus.map((s, i) => {
                const widthPct = Math.max(8, Math.round((s.count / maxStatusCount) * 100));
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-300">{s.column}</span>
                      <span className="text-white font-bold">{s.count}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-purple to-violet-500 transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Assignees Dashboard */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-white font-display">Top Assignees</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Workspace members with the highest assigned card counts.</p>
          </div>

          {stats.topAssignees.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-600 text-xs">
              <Users size={20} className="mb-2 opacity-50" />
              No card assignments found.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.topAssignees.map((assignee, i) => {
                const widthPct = Math.max(8, Math.round((assignee.count / maxAssigneeCount) * 100));
                const user = assignee.user;
                return (
                  <div key={i} className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        (user?.name?.[0] || 'U').toUpperCase()
                      )}
                    </div>

                    {/* Progress details */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-[150px]">{user?.name || 'Unknown'}</span>
                        <span className="text-slate-400 font-semibold">{assignee.count} cards</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-sky-500 transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Breakdown Table */}
      <div className="glass-panel rounded-2xl border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-900 flex items-center gap-2">
          <Briefcase size={16} className="text-brand-purple" />
          <div>
            <h3 className="text-sm font-bold text-white font-display">Project Health & Performance</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Archived status, boards, cards, and overall completion rate.</p>
          </div>
        </div>

        {stats.projectBreakdown.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-xs">
            No projects available in this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 text-slate-500 border-b border-slate-900">
                  <th className="px-6 py-3 font-semibold">Project Name</th>
                  <th className="px-6 py-3 font-semibold text-center">Boards</th>
                  <th className="px-6 py-3 font-semibold text-center">Total Cards</th>
                  <th className="px-6 py-3 font-semibold text-center">Completed</th>
                  <th className="px-6 py-3 font-semibold text-center text-rose-400">Overdue</th>
                  <th className="px-6 py-3 font-semibold text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {stats.projectBreakdown.map((project, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[180px]">{project.name}</span>
                        {project.isArchived && (
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-500 rounded text-[9px] font-bold uppercase">Archived</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">{project.totalBoards}</td>
                    <td className="px-6 py-4 text-center text-slate-400 font-medium">{project.totalCards}</td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-medium">{project.doneCards}</td>
                    <td className="px-6 py-4 text-center text-rose-400 font-medium">{project.overdueCards}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-bold text-white">{project.completionPct}%</span>
                        <div className="w-16 h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${project.completionPct === 100 ? 'bg-emerald-500' : 'bg-brand-purple'}`}
                            style={{ width: `${project.completionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Label Cloud Cloud Section */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800/80 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-brand-purple" />
          <div>
            <h3 className="text-sm font-bold text-white font-display">Most Frequent Labels</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Top labels utilized across cards in the entire workspace.</p>
          </div>
        </div>

        {stats.labelFrequency.length === 0 ? (
          <div className="py-6 text-center text-slate-600 text-xs">
            No labels found on cards.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 pt-2">
            {stats.labelFrequency.map((lbl, idx) => (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all hover:scale-105 ${getLabelStyle(idx)}`}
              >
                <span>{lbl.label}</span>
                <span className="w-4 h-4 rounded-full bg-slate-950/40 text-[9px] font-bold flex items-center justify-center">
                  {lbl.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default AnalyticsDashboard;
