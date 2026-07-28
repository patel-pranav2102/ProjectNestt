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
import { Plus, Trash2, LayoutDashboard, X, ChevronDown, Zap } from 'lucide-react';

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
      const data = await createNewBoard({ projectId, name: boardName });
      dispatch(addBoard(data.board));
      dispatch(setActiveBoard(data.board));
      setBoardName('');
      setShowCreateModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create board.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!activeBoard) return;
    if (!confirm('Delete this board and ALL its cards? This is irreversible.')) return;
    setLoading(true);
    try {
      await deleteBoardDetails(activeBoard._id);
      dispatch(removeBoard(activeBoard._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete board.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 justify-between px-4 py-3 rounded-xl border border-slate-800/60 bg-slate-950/50 backdrop-blur-sm">
        {/* Left: board identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-purple/15 border border-brand-purple/25 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard size={13} className="text-brand-purple" />
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-600">Active Board</span>
            {boards.length > 0 ? (
              <div className="relative flex items-center gap-1">
                <select
                  value={activeBoard?._id || ''}
                  onChange={handleSelectBoard}
                  className="appearance-none bg-transparent border-none text-sm font-semibold text-white focus:outline-none cursor-pointer pr-5 max-w-[200px] truncate"
                >
                  {boards.map(b => (
                    <option key={b._id} value={b._id} className="bg-slate-900 text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-slate-500 absolute right-0 pointer-events-none" />
              </div>
            ) : (
              <span className="text-sm text-slate-500 italic">No boards yet</span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {activeBoard && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Zap size={10} className="text-brand-purple" />
              <span>{activeBoard.columns?.length || 0} columns</span>
            </div>
          )}

          {hasAdminRights && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-brand-purple border border-brand-purple/25 bg-brand-purple/8 hover:bg-brand-purple/15 hover:border-brand-purple/40 transition-all"
            >
              <Plus size={13} />
              <span>New Board</span>
            </button>
          )}

          {hasAdminRights && activeBoard && (
            <button
              onClick={handleDeleteBoard}
              disabled={loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
              title="Delete board"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm text-left" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '1.25rem', boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.05)' }}>
            {/* Modal glow */}
            <div className="absolute inset-0 rounded-[1.25rem] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.08) 0%, transparent 60%)' }} />
            
            <div className="relative p-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-brand-purple/15 border border-brand-purple/25 flex items-center justify-center">
                  <LayoutDashboard size={16} className="text-brand-purple" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">New Board</h3>
                  <p className="text-[11px] text-slate-500">Create a sprint task board</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
                <Input
                  label="Board Name"
                  placeholder="e.g. Sprint 3 – Auth Module"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !boardName.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', boxShadow: loading ? 'none' : '0 4px 15px rgba(139,92,246,0.35)' }}
                >
                  {loading ? 'Creating...' : 'Initialize Board'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BoardSelector;
