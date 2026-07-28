import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../features/authSlice.js';
import { removeWorkspace, setActiveWorkspace } from '../features/workspaceSlice.js';
import { 
  fetchWorkspaceDetails, 
  updateWorkspace, 
  regenerateInvite, 
  leaveWorkspace, 
  deleteWorkspace 
} from '../services/workspaceService.js';
import { fetchWorkspaceActivities } from '../services/activityService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { Copy, RefreshCw, LogOut, Trash2, Edit2, Users, Key, AlertTriangle, Activity, Clock } from 'lucide-react';

const WorkspaceDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const currentUser = useSelector(selectCurrentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updateError, setUpdateError] = useState('');

  // Fetch Workspace Details
  const { data: wsData, isLoading, error } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => fetchWorkspaceDetails(id),
    enabled: !!id,
  });

  const workspace = wsData?.workspace;

  // Fetch Workspace Activities
  const { data: actData } = useQuery({
    queryKey: ['workspace-activities', id],
    queryFn: () => fetchWorkspaceActivities(id),
    enabled: !!id,
  });

  const activities = actData?.activities || [];

  // Determine permissions
  const isOwner = workspace?.owner?._id === currentUser?.id;
  const isAdmin = workspace?.members?.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin' || isOwner;

  // 1. Copy Invite Code
  const handleCopyInvite = () => {
    if (!workspace?.inviteCode) return;
    navigator.clipboard.writeText(workspace.inviteCode);
    alert('Invite code copied to clipboard!');
  };



  // 3. Update Workspace Details Mutation
  const updateWorkspaceMutation = useMutation({
    mutationFn: (updatedData) => updateWorkspace(id, updatedData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['workspace', id]);
      setIsEditing(false);
      setUpdateError('');
      alert('Workspace updated successfully.');
    },
    onError: (err) => {
      setUpdateError(err.response?.data?.message || 'Failed to update workspace.');
    },
  });

  // 4. Leave Workspace Mutation
  const leaveWorkspaceMutation = useMutation({
    mutationFn: () => leaveWorkspace(id),
    onSuccess: () => {
      dispatch(removeWorkspace(id));
      alert('You have left the workspace.');
      navigate('/dashboard');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to leave workspace.');
    },
  });

  // 5. Delete Workspace Mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => deleteWorkspace(id),
    onSuccess: () => {
      dispatch(removeWorkspace(id));
      alert('Workspace deleted successfully.');
      navigate('/dashboard');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete workspace.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading Workspace Details...</span>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto text-center flex flex-col items-center gap-4">
        <AlertTriangle className="text-rose-500" size={36} />
        <h3 className="text-xl font-bold text-white">Error Loading Workspace</h3>
        <p className="text-xs text-slate-400">{error?.response?.data?.message || 'Workspace not found or unauthorized access.'}</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} className="w-full">Return to Dashboard</Button>
      </div>
    );
  }

  const handleEditInit = () => {
    setEditName(workspace.name);
    setEditDesc(workspace.description);
    setIsEditing(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateWorkspaceMutation.mutate({ name: editName, description: editDesc });
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Workspace Header Panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-purple/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-3 max-w-lg">
              {updateError && <span className="text-xs text-rose-500">{updateError}</span>}
              <Input
                label="Workspace Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple h-16 resize-none"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="accent" size="sm" isLoading={updateWorkspaceMutation.isPending}>Save</Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3 mb-1">
                {workspace.name}
                {isAdmin && (
                  <button 
                    onClick={handleEditInit} 
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{workspace.description || 'No description provided.'}</p>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5">
          {!isOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => leaveWorkspaceMutation.mutate()}
              isLoading={leaveWorkspaceMutation.isPending}
              className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut size={14} className="mr-1.5" />
              <span>Leave Workspace</span>
            </Button>
          )}

          {isOwner && (
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                if (confirm('Are you absolutely sure you want to delete this workspace? This deletes all channels, projects, and messages.')) {
                  deleteWorkspaceMutation.mutate();
                }
              }}
              isLoading={deleteWorkspaceMutation.isPending}
            >
              <Trash2 size={14} className="mr-1.5" />
              <span>Delete Workspace</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Members & Access Codes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Invite Code panel */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2.5 text-brand-purple font-semibold">
            <Key size={18} />
            <span className="text-xs uppercase tracking-wider">Access Control</span>
          </div>
          
          <h3 className="text-sm text-slate-300">Invite Members</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Share the 8-character invitation code below with your developers to let them join this workspace.</p>

          <div className="flex gap-2 items-center bg-slate-950 p-3 rounded-lg border border-slate-900 select-all font-mono text-sm font-semibold tracking-wider text-white">
            <span className="flex-1">{workspace.inviteCode || 'N/A'}</span>
            <button 
              onClick={handleCopyInvite} 
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <Copy size={14} />
            </button>
          </div>


        </div>

        {/* Right Column: Member list */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-brand-cyan font-semibold">
              <Users size={18} />
              <span className="text-xs uppercase tracking-wider">Workspace Members</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-semibold text-slate-300">{workspace.members?.length || 0} Total</span>
          </div>

          <div className="flex flex-col gap-3 divide-y divide-slate-800/40">
            {workspace.members?.map((member) => {
              const u = member.userId;
              if (!u) return null;
              
              const isUserOwner = workspace.owner?._id === u._id;
              const isUserAdmin = member.role === 'Admin';
              
              return (
                <div key={u._id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* User profile picture */}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        {u.name}
                        {u._id === currentUser?.id && <span className="text-[10px] text-slate-400 font-normal italic">(You)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Active Status indicator */}
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'online' ? 'bg-emerald-400' : u.status === 'away' ? 'bg-amber-400' : 'bg-slate-600'
                      }`} />
                      <span className="capitalize">{u.status || 'offline'}</span>
                    </span>

                    {/* Member Role details */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                      isUserOwner 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                        : isUserAdmin 
                          ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' 
                          : 'bg-slate-850 border-slate-800 text-slate-400'
                    }`}>
                      {isUserOwner ? 'Owner' : member.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Workspace Activity Timeline Log */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-brand-purple font-semibold">
          <Activity size={18} />
          <span className="text-xs uppercase tracking-wider">Workspace Audit Logs</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600">
            No workspace activities recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 border-l border-slate-800/80 flex flex-col gap-5 text-xs text-slate-400">
            {activities.map((act) => (
              <div key={act._id} className="relative flex flex-col gap-1 text-left">
                {/* Node icon marker */}
                <span className="absolute -left-[30px] top-0.5 p-1 bg-slate-900 border border-slate-800 text-brand-cyan rounded-full">
                  <Clock size={10} />
                </span>

                <p className="text-slate-300">
                  <span className="font-bold text-white mr-1">{act.userId?.name || 'Someone'}</span>
                  {act.action}
                  {act.details?.projectName && (
                    <span className="text-brand-purple font-semibold ml-1">"{act.details.projectName}"</span>
                  )}
                  {act.details?.workspaceName && (
                    <span className="text-brand-cyan font-semibold ml-1">"{act.details.workspaceName}"</span>
                  )}
                </p>
                <span className="text-[10px] text-slate-600">{new Date(act.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default WorkspaceDashboard;
