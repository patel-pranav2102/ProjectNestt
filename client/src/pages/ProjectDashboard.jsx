import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../features/authSlice.js';
import { removeProject } from '../features/projectSlice.js';
import { selectTeams } from '../features/teamSlice.js';
import { 
  fetchProjectDetails, 
  updateProjectDetails, 
  archiveProjectStatus, 
  deleteProjectDetails, 
  addMemberToProject, 
  removeMemberFromProject 
} from '../services/projectService.js';
import { fetchWorkspaceDetails } from '../services/workspaceService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { UserPlus, UserMinus, Shield, Edit2, Trash2, Users, Archive, ArrowLeft, AlertTriangle } from 'lucide-react';

const ProjectDashboard = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const currentUser = useSelector(selectCurrentUser);
  const teams = useSelector(selectTeams);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('Member');
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorAction, setErrorAction] = useState('');

  // 1. Fetch Project Details
  const { data: projData, isLoading: isProjLoading, error: projError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  const project = projData?.project;
  const projectMembers = projData?.members || [];

  // 2. Fetch Parent Workspace Details (to list users eligible to join project)
  const { data: wsData } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId),
    enabled: !!workspaceId,
  });

  const workspace = wsData?.workspace;

  // Determine user permissions
  const isWorkspaceAdmin = workspace?.owner?._id === currentUser?.id || 
    workspace?.members?.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  
  const isProjAdmin = projectMembers?.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  const hasAdminRights = isWorkspaceAdmin || isProjAdmin;

  // Mutations
  // Update Project Details
  const updateProjectMutation = useMutation({
    mutationFn: (updatedData) => updateProjectDetails(projectId, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId]);
      setIsEditing(false);
      alert('Project settings updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to update project.');
    },
  });

  // Archive Project Toggle
  const archiveProjectMutation = useMutation({
    mutationFn: (archiveState) => archiveProjectStatus(projectId, { isArchived: archiveState }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['project', projectId]);
      alert(data.message);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to change project archive status.');
    },
  });

  // Delete Project
  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProjectDetails(projectId),
    onSuccess: () => {
      dispatch(removeProject(projectId));
      alert('Project deleted successfully.');
      navigate(`/workspace/${workspaceId}`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete project.');
    },
  });

  if (isProjLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading Project Details...</span>
      </div>
    );
  }

  if (projError || !project) {
    return (
      <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto text-center flex flex-col items-center gap-4">
        <AlertTriangle className="text-rose-500" size={36} />
        <h3 className="text-xl font-bold text-white">Error Loading Project</h3>
        <p className="text-xs text-slate-400">{projError?.response?.data?.message || 'Project not found or access forbidden.'}</p>
        <Button variant="secondary" onClick={() => navigate(`/workspace/${workspaceId}`)} className="w-full">Return to Workspace</Button>
      </div>
    );
  }

  const handleEditInit = () => {
    setEditName(project.name);
    setEditDesc(project.description);
    setEditTeamId(project.teamId || '');
    setIsEditing(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateProjectMutation.mutate({ name: editName, description: editDesc, teamId: editTeamId });
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoadingAction(true);
    setErrorAction('');
    try {
      await addMemberToProject(projectId, { userId: selectedUser, role: selectedRole });
      queryClient.invalidateQueries(['project', projectId]);
      setSelectedUser('');
      alert('Member added to project successfully.');
    } catch (err) {
      setErrorAction(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await removeMemberFromProject(projectId, userId);
      queryClient.invalidateQueries(['project', projectId]);
      alert('Member removed successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  // Filter workspace members to list only those NOT in the project
  const workspaceMembersList = workspace?.members || [];
  const projectMembersMap = new Set(projectMembers?.map(m => m.userId?._id.toString()));
  const eligibleUsers = workspaceMembersList.filter(wm => wm.userId && !projectMembersMap.has(wm.userId._id.toString()));

  const associatedTeam = teams.find(t => t._id === project.teamId);

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Back to Workspace */}
      <button 
        onClick={() => navigate(`/workspace/${workspaceId}`)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors self-start"
      >
        <ArrowLeft size={14} />
        <span>Back to Workspace Dashboard</span>
      </button>

      {/* Project Archive Banner Warning */}
      {project.isArchived && (
        <div className="glass-panel p-4 rounded-xl border-l-4 border-l-amber-500 bg-amber-500/5 text-amber-200 text-xs flex gap-3 items-center">
          <Archive size={16} className="text-amber-500 flex-shrink-0" />
          <span>This project is currently archived. Task updates and channel creations are read-only.</span>
        </div>
      )}

      {/* Project Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-purple/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-3 max-w-lg">
              <Input
                label="Project Name"
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

              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="editTeamSelect" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Associate Team
                </label>
                <select
                  id="editTeamSelect"
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                >
                  <option value="">-- No Team Associated --</option>
                  {teams.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="accent" size="sm" isLoading={updateProjectMutation.isPending}>Save</Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3 mb-1">
                {project.name}
                {hasAdminRights && (
                  <button 
                    onClick={handleEditInit} 
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {associatedTeam && (
                  <span className="px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-semibold">
                    Team: {associatedTeam.name}
                  </span>
                )}
                {project.isArchived && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-semibold">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-3 max-w-2xl leading-relaxed">{project.description || 'No description provided.'}</p>
            </>
          )}
        </div>

        {/* Action Controls */}
        {hasAdminRights && (
          <div className="flex flex-wrap gap-2.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => archiveProjectMutation.mutate(!project.isArchived)}
              isLoading={archiveProjectMutation.isPending}
            >
              <Archive size={14} className="mr-1.5" />
              <span>{project.isArchived ? 'Unarchive Project' : 'Archive Project'}</span>
            </Button>
            
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                if (confirm('Are you absolutely sure you want to delete this project? This permanently erases all associated boards, tasks, logs, and channels.')) {
                  deleteProjectMutation.mutate();
                }
              }}
              isLoading={deleteProjectMutation.isPending}
            >
              <Trash2 size={14} className="mr-1.5" />
              <span>Delete Project</span>
            </Button>
          </div>
        )}
      </div>

      {/* Grid Content: Add Member Form & Members Directory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Add Member (Project Admin check) */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2.5 text-brand-purple font-semibold">
            <UserPlus size={18} />
            <span className="text-xs uppercase tracking-wider">Project Enrollment</span>
          </div>

          <h3 className="text-sm text-slate-350">Add Workspace Member</h3>
          <p className="text-xs text-slate-450 leading-relaxed">Enroll developers registered inside this parent workspace into this specific project board.</p>

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
                  onChange={(e) => setSelectedUser(e.target.value)}
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
                  Project Permission Role
                </label>
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                >
                  <option value="Member">Member (Read/Write)</option>
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <Button type="submit" variant="accent" isLoading={loadingAction} className="w-full text-xs mt-1">
                Add to Project
              </Button>
            </form>
          ) : (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-900 text-xs text-slate-500 text-center">
              Project membership dispatches are restricted to Project Administrators.
            </div>
          )}
        </div>

        {/* Right Column: Member Directory list */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-brand-cyan font-semibold">
              <Users size={18} />
              <span className="text-xs uppercase tracking-wider">Project Directory</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-semibold text-slate-300">
              {projectMembers?.length || 0} Enrolled
            </span>
          </div>

          <div className="flex flex-col gap-3 divide-y divide-slate-800/40">
            {projectMembers.map((member) => {
              const u = member.userId;
              if (!u) return null;

              const isProjAdminRole = member.role === 'Admin';
              const isProjViewerRole = member.role === 'Viewer';
              
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
                      isProjAdminRole 
                        ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' 
                        : isProjViewerRole
                          ? 'bg-slate-850 border-slate-800 text-slate-500'
                          : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
                    }`}>
                      {isProjAdminRole && <Shield size={10} />}
                      {member.role}
                    </span>

                    {/* Remove Action (Admin only, and cannot remove oneself) */}
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

export default ProjectDashboard;
