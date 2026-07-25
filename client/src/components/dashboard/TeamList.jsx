import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectActiveWorkspace } from '../../features/workspaceSlice.js';
import { 
  selectTeams, 
  selectActiveTeam, 
  setActiveTeam, 
  addTeam 
} from '../../features/teamSlice.js';
import { createNewTeam } from '../../services/teamService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { Plus, Users, X } from 'lucide-react';

const TeamList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const teams = useSelector(selectTeams);
  const activeTeam = useSelector(selectActiveTeam);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if current user is Workspace Owner or Admin to display team builder link
  const currentUser = useSelector((state) => state.auth.user);
  const isWorkspaceAdmin = activeWorkspace?.owner === currentUser?.id || 
    activeWorkspace?.members?.find(m => m.userId === currentUser?.id)?.role === 'Admin';

  const handleSelectTeam = (team) => {
    dispatch(setActiveTeam(team));
    navigate(`/workspace/${activeWorkspace._id}/team/${team._id}`);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !activeWorkspace) return;

    setLoading(true);
    setError('');
    try {
      const data = await createNewTeam({ 
        workspaceId: activeWorkspace._id,
        name: newTeamName, 
        description: newTeamDesc 
      });
      dispatch(addTeam(data.team));
      dispatch(setActiveTeam(data.team));
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateModal(false);
      navigate(`/workspace/${activeWorkspace._id}/team/${data.team._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-slate-900">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Teams</span>
        {isWorkspaceAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-1 rounded text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
            title="Create Team"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {teams.map((team) => (
          <button
            key={team._id}
            onClick={() => handleSelectTeam(team)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors w-full
              ${activeTeam?._id === team._id 
                ? 'bg-brand-purple/10 text-white' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
          >
            <Users size={14} className={activeTeam?._id === team._id ? 'text-brand-purple' : 'text-slate-500'} />
            <span className="text-sm font-medium truncate">{team.name}</span>
          </button>
        ))}

        {teams.length === 0 && (
          <span className="text-xs text-slate-650 italic px-3 py-1">No active teams.</span>
        )}
      </div>

      {/* Create Team Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold font-display text-white mb-4">Create Subgroup Team</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
              <Input
                label="Team Name"
                placeholder="e.g. Frontend Developers"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple h-20 resize-none"
                  placeholder="Describe this subgroup..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                />
              </div>
              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
                Create Team
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamList;
