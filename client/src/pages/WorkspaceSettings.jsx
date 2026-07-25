import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Users, AlertTriangle, Copy, RefreshCw,
  CheckCircle, Crown, Shield, UserMinus, Save, Trash2, LogOut, ChevronDown
} from 'lucide-react';
import { selectCurrentUser } from '../features/authSlice.js';
import {
  selectActiveWorkspace,
  setActiveWorkspace,
  setWorkspaces,
  selectWorkspaces,
} from '../features/workspaceSlice.js';
import { fetchWorkspaceDetails, updateWorkspace, regenerateInvite, deleteWorkspace, leaveWorkspace } from '../services/workspaceService.js';
import { updateMemberRole, removeMember } from '../services/memberService.js';

/* ─── Tab definitions ────────────────────────────────────── */
const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

/* ─── small helpers ──────────────────────────────────────── */
const Avatar = ({ user, size = 8 }) => (
  <div className={`w-${size} h-${size} rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0`}>
    {user?.avatarUrl
      ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
      : (user?.name?.[0] || '?').toUpperCase()
    }
  </div>
);

/* ─── component ──────────────────────────────────────────── */
const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const qClient = useQueryClient();
  const currentUser = useSelector(selectCurrentUser);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const allWorkspaces = useSelector(selectWorkspaces);

  const [tab, setTab] = useState('general');
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [roleLoading, setRoleLoading] = useState(null); // userId being updated
  const [removeLoading, setRemoveLoading] = useState(null);

  /* ── Fetch workspace details ── */
  const { data, refetch } = useQuery({
    queryKey: ['workspace-settings', workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId),
    enabled: !!workspaceId,
  });

  const workspace = data?.workspace;
  const members = workspace?.members || [];
  const isOwner = workspace?.owner?._id === currentUser?._id || workspace?.owner === currentUser?._id;

  // Pre-fill general form
  useEffect(() => {
    if (workspace) {
      setWsName(workspace.name || '');
      setWsDesc(workspace.description || '');
    }
  }, [workspace]);

  /* ── Check admin access ── */
  const myMembership = members.find(m => {
    const uid = m.userId?._id || m.userId;
    return uid?.toString() === currentUser?._id;
  });
  const isAdmin = isOwner || myMembership?.role === 'Admin';

  /* ── General: save name/description ── */
  const handleSaveGeneral = async () => {
    try {
      setSaveMsg('');
      await updateWorkspace(workspaceId, { name: wsName, description: wsDesc });
      setSaveMsg('Saved successfully!');
      refetch();
      // Update Redux active workspace name
      if (activeWorkspace?._id === workspaceId) {
        dispatch(setActiveWorkspace({ ...activeWorkspace, name: wsName, description: wsDesc }));
      }
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err?.response?.data?.message || 'Failed to save changes.');
    }
  };

  /* ── Members: copy invite code ── */
  const handleCopy = () => {
    if (!workspace?.inviteCode) return;
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Members: regenerate invite code ── */
  const handleRegenerate = async () => {
    try {
      await regenerateInvite(workspaceId);
      refetch();
    } catch { /* silent */ }
  };

  /* ── Members: change role ── */
  const handleRoleChange = async (userId, newRole) => {
    setRoleLoading(userId);
    try {
      await updateMemberRole(workspaceId, userId, newRole);
      refetch();
    } catch { /* silent */ }
    finally { setRoleLoading(null); }
  };

  /* ── Members: remove member ── */
  const handleRemove = async (userId) => {
    setRemoveLoading(userId);
    try {
      await removeMember(workspaceId, userId);
      refetch();
    } catch { /* silent */ }
    finally { setRemoveLoading(null); }
  };

  /* ── Danger: delete workspace ── */
  const handleDelete = async () => {
    if (deleteConfirm !== workspace?.name) return;
    try {
      await deleteWorkspace(workspaceId);
      const remaining = allWorkspaces.filter(w => w._id !== workspaceId);
      dispatch(setWorkspaces(remaining));
      dispatch(setActiveWorkspace(remaining[0] || null));
      navigate('/dashboard');
    } catch { /* silent */ }
  };

  /* ── Danger: leave workspace ── */
  const handleLeave = async () => {
    try {
      await leaveWorkspace(workspaceId);
      const remaining = allWorkspaces.filter(w => w._id !== workspaceId);
      dispatch(setWorkspaces(remaining));
      dispatch(setActiveWorkspace(remaining[0] || null));
      navigate('/dashboard');
    } catch { /* silent */ }
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col gap-5 p-1 md:p-6 text-left h-[82svh] overflow-hidden">

      {/* ── Page header ── */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
          <Settings size={20} className="text-brand-purple" />
          Workspace Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage <span className="text-brand-cyan font-semibold">{workspace?.name || '...'}</span> workspace settings and members.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 shrink-0 border-b border-slate-900 pb-0">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`settings-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${active
                  ? 'border-brand-purple text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
                } ${t.id === 'danger' && !active ? 'hover:text-rose-400' : ''}`}
            >
              <Icon size={13} className={t.id === 'danger' ? 'text-rose-400' : ''} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 pb-4">

        {/* ────── GENERAL TAB ────── */}
        {tab === 'general' && (
          <div className="flex flex-col gap-6 max-w-lg">
            <div className="glass-panel rounded-2xl p-6 border-slate-900/60 flex flex-col gap-5">
              <h3 className="text-sm font-bold text-white font-display">General Information</h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Workspace Name</label>
                <input
                  id="ws-name-input"
                  type="text"
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  maxLength={100}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-purple/60 transition-colors placeholder-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</label>
                <textarea
                  id="ws-desc-input"
                  value={wsDesc}
                  onChange={e => setWsDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-purple/60 transition-colors resize-none placeholder-slate-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="ws-save-btn"
                  onClick={handleSaveGeneral}
                  disabled={!isAdmin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={13} />
                  Save Changes
                </button>
                {saveMsg && (
                  <span className={`text-xs font-medium flex items-center gap-1 ${saveMsg.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <CheckCircle size={12} />
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ────── MEMBERS TAB ────── */}
        {tab === 'members' && (
          <div className="flex flex-col gap-5 max-w-2xl">

            {/* Invite Code Card */}
            <div className="glass-panel rounded-2xl p-5 border-slate-900/60 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white font-display">Invite Code</h3>
              <p className="text-xs text-slate-500">Share this code with people you'd like to invite to this workspace.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-brand-cyan tracking-widest">
                  {workspace?.inviteCode || '--------'}
                </code>
                <button
                  id="invite-copy-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                {isAdmin && (
                  <button
                    id="invite-regen-btn"
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                    title="Regenerate invite code"
                  >
                    <RefreshCw size={13} />
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="glass-panel rounded-2xl border-slate-900/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-display">
                  Members <span className="text-slate-600 font-normal text-xs ml-1">({members.length})</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-900">
                {members.map(m => {
                  const user = m.userId;
                  const uid = user?._id || user;
                  const isOwnerRow = workspace?.owner?._id === uid || workspace?.owner === uid;
                  const isMe = uid?.toString() === currentUser?._id;
                  const role = m.role || 'Member';

                  return (
                    <div key={uid} className="flex items-center gap-4 px-5 py-3.5">
                      <Avatar user={user} size={9} />

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          {user?.name || uid}
                          {isOwnerRow && <Crown size={11} className="text-amber-400 shrink-0" />}
                          {isMe && <span className="text-[9px] text-slate-600">(you)</span>}
                        </p>
                        <p className="text-[10px] text-slate-600 truncate">{user?.email}</p>
                      </div>

                      {/* Role selector */}
                      {isAdmin && !isOwnerRow ? (
                        <div className="relative">
                          <select
                            value={role}
                            disabled={roleLoading === uid}
                            onChange={e => handleRoleChange(uid, e.target.value)}
                            className="appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Member">Member</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${role === 'Admin'
                            ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}>
                          {isOwnerRow ? 'Owner' : role}
                        </span>
                      )}

                      {/* Remove button */}
                      {isAdmin && !isOwnerRow && !isMe && (
                        <button
                          onClick={() => handleRemove(uid)}
                          disabled={removeLoading === uid}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                          title="Remove member"
                        >
                          {removeLoading === uid
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <UserMinus size={13} />
                          }
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ────── DANGER ZONE TAB ────── */}
        {tab === 'danger' && (
          <div className="flex flex-col gap-5 max-w-lg">

            {/* Leave workspace */}
            {!isOwner && (
              <div className="glass-panel rounded-2xl p-5 border-rose-900/20 bg-rose-950/5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <LogOut size={15} className="text-rose-400" />
                  <h3 className="text-sm font-bold text-rose-300 font-display">Leave Workspace</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You will lose access to all projects, channels, and data in this workspace.
                </p>
                <button
                  id="leave-workspace-btn"
                  onClick={handleLeave}
                  className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-900/20 border border-rose-800/40 text-xs font-bold text-rose-400 hover:bg-rose-900/40 transition-colors"
                >
                  <LogOut size={13} />
                  Leave Workspace
                </button>
              </div>
            )}

            {/* Delete workspace (owner only) */}
            {isOwner && (
              <div className="glass-panel rounded-2xl p-5 border-rose-900/20 bg-rose-950/5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Trash2 size={15} className="text-rose-400" />
                  <h3 className="text-sm font-bold text-rose-300 font-display">Delete Workspace</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will permanently delete <span className="text-white font-semibold">{workspace?.name}</span> and all of its projects, boards, documents, channels, and member data. This action <span className="text-rose-400 font-semibold">cannot be undone</span>.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Type <span className="text-white">{workspace?.name}</span> to confirm
                  </label>
                  <input
                    id="delete-confirm-input"
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={workspace?.name}
                    className="px-3 py-2.5 rounded-xl bg-slate-900 border border-rose-900/40 text-sm text-white focus:outline-none focus:border-rose-600/60 transition-colors placeholder-slate-700"
                  />
                </div>
                <button
                  id="delete-workspace-btn"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== workspace?.name}
                  className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-900/30 border border-rose-700/50 text-xs font-bold text-rose-400 hover:bg-rose-900/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} />
                  Delete Workspace Permanently
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkspaceSettings;
