import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { 
  selectBoards, 
  selectActiveBoard, 
  setActiveBoard, 
  addBoard,
  removeBoard
} from '../../features/kanbanSlice.js';
import { createNewBoard, deleteBoardDetails } from '../../services/kanbanService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { Plus, Trash2, Layout, X } from 'lucide-react';

const BoardSelector = ({ hasAdminRights }) => {
  const { projectId } = useParams();
  const dispatch = useDispatch();

  const boards = useSelector(selectBoards);
  const activeBoard = useSelector(selectActiveBoard);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectBoard = (e) => {
    const selectedId = e.target.value;
    const selected = boards.find(b => b._id === selectedId);
    dispatch(setActiveBoard(selected || null));
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!boardName.trim() || !projectId) return;

    setLoading(true);
    setError('');
    try {
      const data = await createNewBoard({
        projectId,
        name: boardName,
      });
      dispatch(addBoard(data.board));
      dispatch(setActiveBoard(data.board));
      setBoardName('');
      setShowCreateModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create Kanban board.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (!confirm('Are you absolutely sure you want to delete this board and ALL its cards? This action is irreversible.')) return;

    setLoading(true);
    try {
      await deleteBoardDetails(activeBoard._id);
      dispatch(removeBoard(activeBoard._id));
      alert('Kanban board deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete board.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900 justify-between">
      <div className="flex items-center gap-3">
        <Layout size={18} className="text-brand-purple" />
        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Kanban Board</span>
        
        {boards.length > 0 ? (
          <select
            value={activeBoard?._id || ''}
            onChange={handleSelectBoard}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple max-w-xs font-semibold"
          >
            {boards.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-500 italic">No task boards created yet.</span>
        )}
      </div>

      <div className="flex gap-2">
        {hasAdminRights && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateModal(true)}
            className="text-xs"
          >
            <Plus size={14} className="mr-1" />
            <span>Create Board</span>
          </Button>
        )}

        {hasAdminRights && activeBoard && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDeleteBoard}
            isLoading={loading}
            className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-sm relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-bold font-display text-white mb-4">New Kanban Board</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
              <Input
                label="Board Name"
                placeholder="e.g. Sprint 2 Features"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                required
              />
              
              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-1">
                Initialize Board
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardSelector;
