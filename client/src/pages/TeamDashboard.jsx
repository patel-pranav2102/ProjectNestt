import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../features/authSlice.js';
import { removeTeam } from '../features/teamSlice.js';
import { 
  fetchTeamDetails, 
  updateTeam, 
  deleteTeam, 
  addMemberToTeam, 
  removeMemberFromTeam 
} from '../services/teamService.js';
import { fetchWorkspaceDetails } from '../services/workspaceService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { UserPlus, UserMinus, Shield, Edit2, Trash2, Users, ArrowLeft, AlertTriangle } from 'lucide-react';

const TeamDashboard = () => {
  const { workspaceId, teamId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const currentUser = useSelector(selectCurrentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('Member');
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorAction, setErrorAction] = useState('');

  // 1. Fetch Team Details
  const { data: teamData, isLoading: isTeamLoading, error: teamError } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamDetails(teamId),
    enabled: !!teamId,
  });

  const team = teamData?.team;

  // 2. Fetch Parent Workspace Details (to list users eligible to join team)
  const { data: wsData } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId),
    enabled: !!workspaceId,
  });

  const workspace = wsData?.workspace;

  // Determine user permissions
  const isWorkspaceAdmin = workspace?.owner?._id === currentUser?.id || 
    workspace?.members?.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  
  const isTeamLead = team?.members?.find(m => m.userId?._id === currentUser?.id)?.role === 'Lead';
  const isTeamAdmin = team?.members?.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  const hasAdminRights = isWorkspaceAdmin || isTeamLead || isTeamAdmin;

  // Mutations
  // Update Team Details
  const updateTeamMutation = useMutation({
    mutationFn: (updatedData) => updateTeam(teamId, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries(['team', teamId]);
      setIsEditing(false);
      alert('Team settings updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update team.');
    },
  });

  // Delete Team
  const deleteTeamMutation = useMutation({
    mutationFn: () => deleteTeam(teamId),
    onSuccess: () => {
      dispatch(removeTeam(teamId));
      alert('Team deleted successfully.');
      navigate(`/workspace/${workspaceId}`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete team.');
    },
  });

  if (isTeamLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading Team Details...</span>
      </div>
    );
  }

  if (teamError || !team) {
    return (
      <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto text-center flex flex-col items-center gap-4">
        <AlertTriangle className="text-rose-500" size={36} />
        <h3 className="text-xl font-bold text-white">Error Loading Team</h3>
        <p className="text-xs text-slate-400">{teamError?.response?.data?.message || 'Team not found or access forbidden.'}</p>
        <Button variant="secondary" onClick={() => navigate(`/workspace/${workspaceId}`)} className="w-full">Return to Workspace</Button>
      </div>
    );
  }

  const handleEditInit = () => {
    setEditName(team.name);
    setEditDesc(team.description);
    setIsEditing(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateTeamMutation.mutate({ name: editName, description: editDesc });
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoadingAction(true);
    setErrorAction('');
    try {
      await addMemberToTeam(teamId, { userId: selectedUser, role: selectedRole });
      queryClient.invalidateQueries(['team', teamId]);
      setSelectedUser('');
      alert('Member added to team successfully.');
    } catch (err) {
      setErrorAction(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await removeMemberFromTeam(teamId, userId);
      queryClient.invalidateQueries(['team', teamId]);
      alert('Member removed successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  // Filter workspace members to list only those NOT in the team
  const workspaceMembersList = workspace?.members || [];
  const teamMembersMap = new Set(team.members?.map(m => m.userId?._id.toString()));
  const eligibleUsers = workspaceMembersList.filter(wm => wm.userId && !teamMembersMap.has(wm.userId._id.toString()));

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Back to Workspace Link */}
      <button 
        onClick={() => navigate(`/workspace/${workspaceId}`)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors self-start"
      >
        <ArrowLeft size={14} />
        <span>Back to Workspace Dashboard</span>
      </button>

      {/* Team Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-cyan/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-3 max-w-lg">
              <Input
                label="Team Name"
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
                <Button type="submit" variant="accent" size="sm" isLoading={updateTeamMutation.isPending}>Save</Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3 mb-1">
                {team.name}
                {hasAdminRights && (
                  <button 
                    onClick={handleEditInit} 
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{team.description || 'No description provided.'}</p>
            </>
          )}
        </div>

        {/* Action Controls */}
        {hasAdminRights && (
          <div className="flex gap-2.5">
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                if (confirm('Are you sure you want to delete this team? Channels or board items assigned to it might become orphaned.')) {
                  deleteTeamMutation.mutate();
                }
              }}
              isLoading={deleteTeamMutation.isPending}
            >
              <Trash2 size={14} className="mr-1.5" />
              <span>Delete Team</span>
            </Button>
          </div>
        )}
      </div>

      {/* Grid Content: Add Member Form & Members Directory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Add Member (Lead/Admin check) */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2.5 text-brand-purple font-semibold">
            <UserPlus size={18} />
            <span className="text-xs uppercase tracking-wider">Team Enrollment</span>
          </div>

          <h3 className="text-sm text-slate-350">Add Workspace Member</h3>
          <p className="text-xs text-slate-450 leading-relaxed">Enroll developers registered inside this workspace to coordinate permissions.</p>

          {hasAdminRights ? (
            <form onSubmit={handleAddMember} className="flex flex-col gap-4">
              {errorAction && <span className="text-xs text-rose-500">{errorAction}</span>}
              
              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="userSelect" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Workspace Developer
                </label>
                <select
                  id="userSelect"
                  value={selectedUser}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUser(val);
                    const chosen = eligibleUsers.find(wm => wm.userId?._id === val);
                    if (chosen) {
                      const isChosenAdmin = chosen.role === 'Admin' || chosen.userId?.role === 'Admin';
                      const isChosenLead = chosen.userId?.role === 'Team Lead';
                      if (isChosenAdmin) {
                        setSelectedRole('Admin');
                      } else if (isChosenLead) {
                        setSelectedRole('Lead');
                      } else {
                        setSelectedRole('Member');
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {eligibleUsers.map(wm => (
                    <option key={wm.userId._id} value={wm.userId._id}>
                      {wm.userId.name} ({wm.userId.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="roleSelect" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Team Role
                </label>
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                >
                  <option value="Member">Developer</option>
                  <option value="Lead">Team Lead</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <Button type="submit" variant="accent" isLoading={loadingAction} className="w-full text-xs mt-1">
                Add to Team
              </Button>
            </form>
          ) : (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-900 text-xs text-slate-500 text-center">
              Team enrollment actions are restricted to Team Leads or Workspace Administrators.
            </div>
          )}
        </div>

        {/* Right Column: Member Directory list */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-brand-cyan font-semibold">
              <Users size={18} />
              <span className="text-xs uppercase tracking-wider">Team Directory</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-semibold text-slate-300">
              {team.members?.length || 0} Members
            </span>
          </div>

          <div className="flex flex-col gap-3 divide-y divide-slate-800/40">
            {team.members?.map((member) => {
              const u = member.userId;
              if (!u) return null;

              const isLead = member.role === 'Lead';
              const isAdmin = member.role === 'Admin';
              
              return (
                <div key={u._id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
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

                  <div className="flex items-center gap-4">
                    {/* Active Status indicator */}
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'online' ? 'bg-emerald-400' : u.status === 'away' ? 'bg-amber-400' : 'bg-slate-600'
                      }`} />
                      <span className="capitalize">{u.status || 'offline'}</span>
                    </span>

                    {/* Member Role details */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                      isAdmin 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        : isLead 
                        ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' 
                        : 'bg-slate-850 border-slate-800 text-slate-400'
                    }`}>
                      {(isLead || isAdmin) && <Shield size={10} />}
                      {member.role === 'Member' ? 'Developer' : member.role === 'Lead' ? 'Team Lead' : member.role}
                    </span>

                    {/* Remove Action (Admin/Lead only, and cannot remove oneself) */}
                    {hasAdminRights && u._id !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveMember(u._id)}
                        className="p-1 text-slate-500 hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeamDashboard;
