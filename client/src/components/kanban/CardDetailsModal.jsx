import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectActiveCard, 
  setActiveCard, 
  updateCardState,
  removeCardState
} from '../../features/kanbanSlice.js';
import { selectActiveWorkspace } from '../../features/workspaceSlice.js';
import { selectCurrentUser } from '../../features/authSlice.js';
import { 
  updateCardDetails, 
  toggleCardAssignee, 
  postCardComment, 
  removeCardComment,
  deleteCardDetails,
  fetchCardDetails
} from '../../services/kanbanService.js';
import Button from '../common/Button.jsx';
import { X, Calendar, User, Tag, Clock, Trash2, Edit2, Plus, MessageSquare } from 'lucide-react';

const CardDetailsModal = () => {
  const dispatch = useDispatch();
  
  const activeCard = useSelector(selectActiveCard);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const currentUser = useSelector(selectCurrentUser);

  const isWSAdmin = activeWorkspace?.owner === currentUser?.id || 
    activeWorkspace?.members?.find(m => (m.userId?._id || m.userId) === currentUser?.id || m.userId === currentUser?.id)?.role === 'Admin';
  const canAssignOthers = currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin' || isWSAdmin;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [cardDesc, setCardDesc] = useState('');

  const [newComment, setNewComment] = useState('');
  const [newLabel, setNewLabel] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fullCard, setFullCard] = useState(null);

  // Fetch fully-populated card (with activityLog.userId populated) when modal opens
  useEffect(() => {
    if (activeCard?._id) {
      setFullCard(null); // reset while loading
      fetchCardDetails(activeCard._id)
        .then(data => setFullCard(data.card))
        .catch(() => setFullCard(activeCard)); // fallback to Redux card on error
    } else {
      setFullCard(null);
    }
  }, [activeCard?._id]);

  useEffect(() => {
    if (activeCard) {
      setCardTitle(activeCard.name);
      setCardDesc(activeCard.description || '');
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
  }, [activeCard]);

  // Always read audit log from fullCard (which has populated userId)
  const displayCard = fullCard || activeCard;

  if (!activeCard) return null;

  const handleUpdateDetails = async (updates) => {
    try {
      const data = await updateCardDetails(activeCard._id, updates);
      dispatch(updateCardState(data.card));
      setFullCard(data.card);
    } catch (err) {
      alert('Failed to update card details.');
    }
  };

  const handleTitleSave = () => {
    if (!cardTitle.trim()) return;
    handleUpdateDetails({ name: cardTitle });
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    handleUpdateDetails({ description: cardDesc });
    setIsEditingDesc(false);
  };

  // Toggle Assignee
  const handleToggleAssignee = async (userId) => {
    if (!canAssignOthers && userId !== currentUser?.id) {
      alert('Developers cannot assign tasks to others.');
      return;
    }
    try {
      const data = await toggleCardAssignee(activeCard._id, userId);
      dispatch(updateCardState(data.card));
      setFullCard(data.card);
    } catch (err) {
      alert('Failed to update task assignees.');
    }
  };

  // Due Date update
  const handleDueDateChange = (e) => {
    const val = e.target.value;
    handleUpdateDetails({ dueDate: val ? new Date(val).toISOString() : null });
  };

  // Custom Label tag addition
  const handleAddLabel = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const updated = [...(activeCard.labels || []), newLabel.trim()];
    handleUpdateDetails({ labels: updated });
    setNewLabel('');
  };

  const handleRemoveLabel = (labelToRemove) => {
    const updated = activeCard.labels.filter(l => l !== labelToRemove);
    handleUpdateDetails({ labels: updated });
  };

  // Comments management
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const data = await postCardComment(activeCard._id, newComment);
      dispatch(updateCardState(data.card));
      setFullCard(data.card);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment permanently?')) return;
    try {
      const data = await removeCardComment(activeCard._id, commentId);
      dispatch(updateCardState(data.card));
      setFullCard(data.card);
    } catch (err) {
      alert('Failed to delete comment.');
    }
  };

  const handleDeleteCard = async () => {
    if (!confirm('Are you sure you want to delete this task card permanently?')) return;
    try {
      await deleteCardDetails(activeCard._id);
      dispatch(removeCardState(activeCard._id));
    } catch (err) {
      alert('Failed to delete card.');
    }
  };

  // Map workspace users for assignment toggling
  const workspaceUsers = activeWorkspace?.members || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150 text-left flex flex-col gap-6">
        
        {/* Close Button */}
        <button
          onClick={() => dispatch(setActiveCard(null))}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Modal Header Title */}
        <div className="pr-8">
          {isEditingTitle ? (
            <div className="flex gap-2 max-w-lg">
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-850 text-base font-bold text-white focus:outline-none focus:border-brand-purple"
                required
              />
              <Button size="sm" variant="accent" onClick={handleTitleSave}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
            </div>
          ) : (
            <h2 
              onClick={() => setIsEditingTitle(true)}
              className="text-2xl font-bold font-display text-white tracking-tight cursor-pointer hover:bg-slate-900/50 p-1.5 rounded flex items-center gap-2 group"
            >
              <span>{activeCard.name}</span>
              <Edit2 size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
          )}
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">In column: {activeCard.column}</p>
        </div>

        {/* Content columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Description, comments, audit logs */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Description Card */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Description</h3>
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={cardDesc}
                    onChange={(e) => setCardDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white h-24 resize-none focus:outline-none"
                    placeholder="Provide detailed instructions..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="accent" onClick={handleDescSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p 
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-slate-400 leading-relaxed cursor-pointer p-3 bg-slate-900/30 border border-slate-900 rounded-lg hover:border-slate-850 hover:bg-slate-900/50 min-h-[50px] whitespace-pre-wrap"
                >
                  {activeCard.description || <span className="text-slate-600 italic">No description details. Click to update.</span>}
                </p>
              )}
            </div>

            {/* Comments block */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>Discussion Board</span>
              </h3>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post a progress update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg text-xs bg-slate-900 border border-slate-850 text-white focus:outline-none"
                  required
                />
                <Button type="submit" variant="accent" size="sm" isLoading={loading}>Post</Button>
              </form>

              <div className="flex flex-col gap-3">
                {activeCard.comments?.map((c) => (
                  <div key={c._id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-900/60 flex items-start gap-2.5 justify-between">
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-[10px] text-white">
                        {c.userId?.avatarUrl ? (
                          <img src={c.userId.avatarUrl} alt={c.userId.name} className="w-full h-full object-cover" />
                        ) : (
                          c.userId?.name?.[0].toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white">{c.userId?.name}</span>
                          <span className="text-[9px] text-slate-550">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                    {(c.userId?._id === currentUser?.id || currentUser?.role === 'Admin') && (
                      <button 
                        onClick={() => handleDeleteComment(c._id)}
                        className="text-slate-550 hover:text-rose-500 p-0.5 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit activities history */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                <span>Audit Activity Log</span>
              </h3>

              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                {!fullCard && (
                  <p className="text-[10px] text-slate-600 italic">Loading activity...</p>
                )}
                {displayCard.activityLog?.map((act) => (
                  <div key={act._id} className="text-[10px] text-slate-500 flex items-start justify-between gap-4">
                    <span className="leading-relaxed">
                      <strong className="text-slate-300">{act.userId?.name || 'Unknown User'}</strong>
                      {act.userId?.role && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold inline-block
                          ${act.userId.role === 'Admin' ? 'bg-rose-500/20 text-rose-400' :
                            act.userId.role === 'Team Lead' ? 'bg-brand-purple/20 text-brand-purple' :
                            'bg-brand-cyan/15 text-brand-cyan'}`}>
                          {act.userId.role}
                        </span>
                      )}
                      <span className="text-slate-500 ml-1">— {act.action}</span>
                      {act.details && <span className="text-slate-600 ml-1">({act.details})</span>}
                    </span>
                    <span className="text-[9px] text-slate-600 flex-shrink-0">{new Date(act.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Settings, assignees, dates, labels */}
          <div className="glass-panel p-4 rounded-xl flex flex-col gap-5 text-left border border-slate-900/60 bg-slate-950/20">
            
            {/* Assignees Checklist */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} className="text-brand-purple" />
                <span>Assignees</span>
              </h4>

              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/60 rounded border border-slate-900">
                {workspaceUsers.map(wm => {
                  const u = wm.userId && typeof wm.userId === 'object' ? wm.userId : null;
                  if (!u || !u.name) return null;
                  if (u.role !== 'Developer') return null;
                  const isAssigned = activeCard.assignees?.some(a => a._id === u._id);
                  const isDisabled = !canAssignOthers && u._id !== currentUser?.id;

                  return (
                    <button
                      key={u._id}
                      disabled={isDisabled}
                      onClick={() => handleToggleAssignee(u._id)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors w-full
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${isAssigned ? 'bg-brand-purple/10 text-white font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name[0].toUpperCase()
                          )}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isAssigned} 
                        disabled={isDisabled}
                        onChange={() => {}} // Controlled via button click
                        className="w-3.5 h-3.5 rounded border-slate-800 text-brand-purple focus:ring-brand-purple scale-75 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Due Date */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} className="text-brand-cyan" />
                <span>Due Date</span>
              </h4>

              <input
                type="date"
                value={activeCard.dueDate ? new Date(activeCard.dueDate).toISOString().substring(0, 10) : ''}
                onChange={handleDueDateChange}
                className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-brand-purple font-medium"
              />
            </div>

            {/* Custom Tag Labels */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={12} className="text-emerald-400" />
                <span>Labels</span>
              </h4>

              <div className="flex flex-wrap gap-1.5 p-1">
                {activeCard.labels?.map(label => (
                  <span 
                    key={label}
                    className="pl-2 pr-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-[10px] font-semibold text-slate-300 flex items-center gap-1"
                  >
                    <span>{label}</span>
                    <button 
                      onClick={() => handleRemoveLabel(label)}
                      className="text-slate-500 hover:text-rose-500 scale-90"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddLabel} className="flex gap-1">
                <input
                  type="text"
                  placeholder="Add label..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1 px-3 py-1 rounded bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none"
                />
                <Button type="submit" variant="secondary" className="p-1 px-2.5 text-xs">
                  <Plus size={10} />
                </Button>
              </form>
            </div>

            {/* Trash Card option */}
            <div className="border-t border-slate-900/60 pt-4 mt-2">
              <Button 
                variant="danger" 
                className="w-full text-xs" 
                onClick={handleDeleteCard}
              >
                <Trash2 size={12} className="mr-1.5" />
                <span>Delete Task Card</span>
              </Button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CardDetailsModal;
