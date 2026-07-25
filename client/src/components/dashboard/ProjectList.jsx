import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectActiveWorkspace } from '../../features/workspaceSlice.js';
import { selectTeams } from '../../features/teamSlice.js';
import { 
  selectProjects, 
  selectActiveProject, 
  setActiveProject, 
  addProject 
} from '../../features/projectSlice.js';
import { createNewProject } from '../../services/projectService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { Plus, Folder, X } from 'lucide-react';

const ProjectList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const projects = useSelector(selectProjects);
  const activeProject = useSelector(selectActiveProject);
  const teams = useSelector(selectTeams);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentUser = useSelector((state) => state.auth.user);
  const isWorkspaceAdmin = activeWorkspace?.owner === currentUser?.id || 
    activeWorkspace?.members?.find(m => m.userId === currentUser?.id)?.role === 'Admin';

  const handleSelectProject = (project) => {
    dispatch(setActiveProject(project));
    navigate(`/workspace/${activeWorkspace._id}/project/${project._id}`);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName.trim() || !activeWorkspace) return;

    setLoading(true);
    setError('');
    try {
      const data = await createNewProject({
        workspaceId: activeWorkspace._id,
        name: newProjName,
        description: newProjDesc,
        teamId: selectedTeam || null,
      });
      dispatch(addProject(data.project));
      dispatch(setActiveProject(data.project));
      setNewProjName('');
      setNewProjDesc('');
      setSelectedTeam('');
      setShowCreateModal(false);
      navigate(`/workspace/${activeWorkspace._id}/project/${data.project._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-slate-900">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Projects</span>
        {isWorkspaceAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-1 rounded text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
            title="Create Project"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {projects.map((proj) => (
          <button
            key={proj._id}
            onClick={() => handleSelectProject(proj)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors w-full
              ${activeProject?._id === proj._id 
                ? 'bg-brand-purple/10 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
          >
            <Folder size={14} className={activeProject?._id === proj._id ? 'text-brand-purple' : 'text-slate-500'} />
            <span className="text-sm truncate flex-1">{proj.name}</span>
            {proj.isArchived && (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-[8px] text-slate-500 font-bold uppercase tracking-wider scale-90">Archived</span>
            )}
          </button>
        ))}

        {projects.length === 0 && (
          <span className="text-xs text-slate-650 italic px-3 py-1">No active projects.</span>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold font-display text-white mb-4">Create Project</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <Input
                label="Project Name"
                placeholder="e.g. Mobile App Redesign"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                required
              />
              
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple h-20 resize-none"
                  placeholder="Describe this project objectives..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 w-full text-left">
                <label htmlFor="teamSelect" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Associate Team (Optional)
                </label>
                <select
                  id="teamSelect"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple"
                >
                  <option value="">-- No Team Associated --</option>
                  {teams.map(team => (
                    <option key={team._id} value={team._id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
                Create Project
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
