import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  selectWorkspaces, 
  selectActiveWorkspace, 
  setActiveWorkspace, 
  addWorkspace 
} from '../../features/workspaceSlice.js';
import { createWorkspace, joinWorkspace } from '../../services/workspaceService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { Plus, Compass, Briefcase, X } from 'lucide-react';

const WorkspaceSwitcher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const workspaces = useSelector(selectWorkspaces);
  const activeWorkspace = useSelector(selectActiveWorkspace);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectWorkspace = (ws) => {
    dispatch(setActiveWorkspace(ws));
    navigate(`/workspace/${ws._id}`);
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await createWorkspace({ name: newWsName, description: newWsDesc });
      dispatch(addWorkspace(data.workspace));
      dispatch(setActiveWorkspace(data.workspace));
      setNewWsName('');
      setNewWsDesc('');
      setShowCreateModal(false);
      navigate(`/workspace/${data.workspace._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await joinWorkspace(inviteCode);
      // Re-trigger dashboard reload by redirecting or navigating to workspace details
      setInviteCode('');
      setShowJoinModal(false);
      alert(data.message || 'Workspace joined successfully!');
      // Force refresh app workspaces
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Workspace Listing */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mb-1">
          Workspaces
        </div>
        
        {workspaces.map((ws) => (
          <button
            key={ws._id}
            onClick={() => handleSelectWorkspace(ws)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 group w-full
              ${activeWorkspace?._id === ws._id 
                ? 'bg-brand-purple/15 text-white border border-brand-purple/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
              }`}
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors
              ${activeWorkspace?._id === ws._id 
                ? 'bg-brand-purple text-white' 
                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
              }`}
            >
              {ws.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate flex-1">{ws.name}</span>
          </button>
        ))}

        {workspaces.length === 0 && (
          <p className="text-xs text-slate-500 italic px-2 py-1">No workspaces joined.</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-purple hover:bg-brand-purple/10 transition-colors w-full text-left"
        >
          <Plus size={14} />
          <span>New Workspace</span>
        </button>
        <button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-cyan hover:bg-brand-cyan/10 transition-colors w-full text-left"
        >
          <Compass size={14} />
          <span>Join with Code</span>
        </button>
      </div>

      {/* Create Workspace Modal Sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold font-display text-white mb-4">Create Workspace</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
              <Input
                label="Workspace Name"
                placeholder="e.g. Acme Engineering"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple h-20 resize-none"
                  placeholder="Describe this workspace workspace..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                />
              </div>
              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
                Create Workspace
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal Sheet */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold font-display text-white mb-4">Join Workspace</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinWorkspace} className="flex flex-col gap-4">
              <Input
                label="Invitation Code"
                placeholder="e.g. a3f9e2b1"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
                Join Workspace
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
