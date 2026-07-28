import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectBoards, 
  selectActiveBoard, 
  selectKanbanCards, 
  setBoards,
  setActiveBoard,
  setCards,
  addCard,
  updateCardState,
  setActiveCard
} from '../features/kanbanSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { fetchProjectBoards, fetchBoardDetails, createNewCard, moveCardPosition } from '../services/kanbanService.js';
import { fetchProjectDetails } from '../services/projectService.js';
import { fetchWorkspaceDetails } from '../services/workspaceService.js';
import BoardSelector from '../components/kanban/BoardSelector.jsx';
import CardDetailsModal from '../components/kanban/CardDetailsModal.jsx';
import Button from '../components/common/Button.jsx';
import { ArrowLeft, AlertCircle, Plus, Calendar, AlignLeft, MessageSquare, Sparkles, GripVertical, User, ChevronDown } from 'lucide-react';

// Column theme configs
const COLUMN_THEMES = {
  'To Do': {
    accent: '#64748b',
    bg: 'rgba(100,116,139,0.07)',
    border: 'rgba(100,116,139,0.25)',
    headerGlow: 'shadow-slate-500/20',
    badge: 'bg-slate-700/60 text-slate-300',
    dot: 'bg-slate-400',
    dragOver: 'border-slate-400 bg-slate-400/5',
    addBtn: 'hover:border-slate-500/60 hover:bg-slate-500/10',
  },
  'In Progress': {
    accent: '#8b5cf6',
    bg: 'rgba(139,92,246,0.05)',
    border: 'rgba(139,92,246,0.2)',
    headerGlow: 'shadow-purple-500/20',
    badge: 'bg-purple-500/20 text-purple-300',
    dot: 'bg-brand-purple animate-pulse',
    dragOver: 'border-brand-purple bg-brand-purple/8',
    addBtn: 'hover:border-purple-500/60 hover:bg-purple-500/10',
  },
  'Testing': {
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.2)',
    headerGlow: 'shadow-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-300',
    dot: 'bg-amber-400',
    dragOver: 'border-amber-400 bg-amber-400/5',
    addBtn: 'hover:border-amber-500/60 hover:bg-amber-500/10',
  },
  'Done': {
    accent: '#10b981',
    bg: 'rgba(16,185,129,0.05)',
    border: 'rgba(16,185,129,0.18)',
    headerGlow: 'shadow-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-400',
    dragOver: 'border-emerald-400 bg-emerald-400/5',
    addBtn: 'hover:border-emerald-500/60 hover:bg-emerald-500/10',
  },
};

const getColumnTheme = (colName) =>
  COLUMN_THEMES[colName] || {
    accent: '#8b5cf6',
    bg: 'rgba(139,92,246,0.05)',
    border: 'rgba(139,92,246,0.2)',
    headerGlow: 'shadow-purple-500/20',
    badge: 'bg-purple-500/20 text-purple-300',
    dot: 'bg-brand-purple',
    dragOver: 'border-brand-purple bg-brand-purple/8',
    addBtn: 'hover:border-purple-500/60 hover:bg-purple-500/10',
  };

const KanbanBoard = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const currentUser = useSelector(selectCurrentUser);
  const boards = useSelector(selectBoards);
  const activeBoard = useSelector(selectActiveBoard);
  const cards = useSelector(selectKanbanCards);
  const activeWorkspace = useSelector(selectActiveWorkspace);

  const [columnInputs, setColumnInputs] = useState({});
  const [columnAssignees, setColumnAssignees] = useState({}); // colName -> string[]
  const [showQuickAdd, setShowQuickAdd] = useState({});
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState({}); // colName -> bool
  const [draggedOverCol, setDraggedOverCol] = useState(null);
  const [draggingCardId, setDraggingCardId] = useState(null);

  // Fetch Project Details
  const { data: projData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  // Fetch Workspace Details (populated members)
  const { data: wsDetails } = useQuery({
    queryKey: ['workspace-details', workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId),
    enabled: !!workspaceId,
  });

  const project = projData?.project;
  const projectMembers = projData?.members || [];

  const isWorkspaceAdmin = (ws) => ws?.owner === currentUser?.id || 
    ws?.members?.find(m => m.userId === currentUser?.id || m.userId?._id === currentUser?.id)?.role === 'Admin';

  const isProjMember = projectMembers.some(m => m.userId?._id === currentUser?.id);
  const isProjAdmin = projectMembers.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  const isWSAdmin = isWorkspaceAdmin(wsDetails?.workspace || activeWorkspace);
  const canMoveCards = isProjMember || isWSAdmin || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin';
  const canAssignOthers = currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin' || isWSAdmin || isProjAdmin;
  const canManageBoards = isProjAdmin || isWSAdmin || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin';

  // Fetch Boards
  const { data: boardsData, isLoading: isBoardsLoading } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => fetchProjectBoards(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (boardsData?.boards) {
      dispatch(setBoards(boardsData.boards));
      if (boardsData.boards.length > 0 && !activeBoard) {
        dispatch(setActiveBoard(boardsData.boards[0]));
      }
    }
  }, [boardsData, dispatch, activeBoard]);

  // Fetch cards inside active board
  const { data: boardDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['board-details', activeBoard?._id],
    queryFn: () => fetchBoardDetails(activeBoard._id),
    enabled: !!activeBoard?._id,
  });

  useEffect(() => {
    if (boardDetails?.cards) {
      dispatch(setCards(boardDetails.cards));
    }
  }, [boardDetails, dispatch]);

  // Quick Card Add
  const handleAddQuickCard = async (colName, nameText) => {
    if (!nameText.trim() || !activeBoard) return;
    const assignees = columnAssignees[colName] || [];
    try {
      const data = await createNewCard({
        boardId: activeBoard._id,
        column: colName,
        name: nameText,
        assignees,
      });
      dispatch(addCard(data.card));
      setColumnInputs(prev => ({ ...prev, [colName]: '' }));
      setColumnAssignees(prev => ({ ...prev, [colName]: [] }));
      setShowQuickAdd(prev => ({ ...prev, [colName]: false }));
      setShowAssigneeDropdown(prev => ({ ...prev, [colName]: false }));
    } catch (err) {
      alert('Failed to create quick card.');
    }
  };

  // Drag and Drop
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('cardId', cardId);
    setDraggingCardId(cardId);
  };

  const handleDragEnd = () => setDraggingCardId(null);

  const handleDragOverCol = (e, colName) => {
    e.preventDefault();
    setDraggedOverCol(colName);
  };

  const handleDropOnCol = async (e, colName) => {
    e.preventDefault();
    setDraggedOverCol(null);
    setDraggingCardId(null);
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    const targetCard = cards.find(c => c._id === cardId);
    if (!targetCard || targetCard.column === colName) return;

    const updatedLocally = { ...targetCard, column: colName };
    dispatch(updateCardState(updatedLocally));

    try {
      await moveCardPosition(cardId, { targetColumn: colName });
    } catch (err) {
      dispatch(updateCardState(targetCard));
      alert('Failed to move card.');
    }
  };

  if (isBoardsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-brand-purple/20 rounded-full" />
          <div className="w-12 h-12 border-2 border-brand-purple border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <span className="text-sm text-slate-400 font-medium font-display">Loading boards...</span>
      </div>
    );
  }

  const workspaceUsers = wsDetails?.workspace?.members || activeWorkspace?.members || [];

  return (
    <div className="flex-1 flex flex-col gap-5 text-left relative">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Project</span>
        </button>

        {activeBoard && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Sparkles size={11} className="text-brand-purple" />
            <span>{cards.length} task{cards.length !== 1 ? 's' : ''} total</span>
          </div>
        )}
      </div>

      {/* Board Selector */}
      <BoardSelector hasAdminRights={canManageBoards} />

      {/* Kanban Columns */}
      {activeBoard ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-6">
          {activeBoard.columns?.map(colName => {
            const theme = getColumnTheme(colName);
            const colCards = cards.filter(c => c.column === colName);
            const isDraggedOver = draggedOverCol === colName;
            const quickText = columnInputs[colName] || '';
            const isQuickAddOpen = showQuickAdd[colName];

            return (
              <div
                key={colName}
                onDragOver={(e) => handleDragOverCol(e, colName)}
                onDragLeave={() => setDraggedOverCol(null)}
                onDrop={(e) => handleDropOnCol(e, colName)}
                style={{
                  background: isDraggedOver ? undefined : theme.bg,
                  borderColor: isDraggedOver ? theme.accent : theme.border,
                }}
                className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden
                  ${isDraggedOver ? theme.dragOver + ' scale-[1.01] shadow-lg' : ''}`}
              >
                {/* Column Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dot}`}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: theme.accent }}
                    >
                      {colName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge}`}
                    >
                      {colCards.length}
                    </span>
                    {isProjMember && (
                      <button
                        onClick={() => setShowQuickAdd(prev => ({ ...prev, [colName]: !isQuickAddOpen }))}
                        style={{ color: isQuickAddOpen ? theme.accent : undefined }}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Plus size={13} className={`transition-transform duration-200 ${isQuickAddOpen ? 'rotate-45' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Add Form */}
                {isQuickAddOpen && isProjMember && (
                  <div
                    className="px-3 py-3 border-b"
                    style={{ borderColor: theme.border, background: 'rgba(0,0,0,0.25)' }}
                  >
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleAddQuickCard(colName, quickText); }}
                      className="flex flex-col gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Task title..."
                        value={quickText}
                        onChange={(e) => setColumnInputs(prev => ({ ...prev, [colName]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all"
                        style={{ '--tw-ring-color': theme.accent }}
                      />
                      {/* Multi-Select Assignee Dropdown */}
                      {(() => {
                        const selectedIds = columnAssignees[colName] || [];
                        const developers = workspaceUsers
                          .map(wm => wm.userId)
                          .filter(u => u && u.name && u.role === 'Developer' &&
                            (canAssignOthers || u._id === currentUser?.id));

                        const toggleAssignee = (uid) => {
                          setColumnAssignees(prev => {
                            const cur = prev[colName] || [];
                            const next = cur.includes(uid)
                              ? cur.filter(id => id !== uid)
                              : [...cur, uid];
                            return { ...prev, [colName]: next };
                          });
                        };

                        return (
                          <div className="relative">
                            {/* Trigger button */}
                            <button
                              type="button"
                              onClick={() => setShowAssigneeDropdown(prev => ({ ...prev, [colName]: !prev[colName] }))}
                              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 hover:border-slate-600 transition-all cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5 flex-1 min-w-0">
                                <User size={10} className="flex-shrink-0" />
                                {selectedIds.length === 0
                                  ? 'No Assignees'
                                  : selectedIds.length === 1
                                    ? developers.find(u => u._id === selectedIds[0])?.name || '1 selected'
                                    : `${selectedIds.length} assignees`
                                }
                              </span>
                              <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${showAssigneeDropdown[colName] ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown */}
                            {showAssigneeDropdown[colName] && (
                              <div
                                className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 overflow-hidden"
                                style={{ background: 'rgba(11,15,25,0.97)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                              >
                                {developers.length === 0 ? (
                                  <div className="px-3 py-2.5 text-[10px] text-slate-500 italic">No developers in workspace</div>
                                ) : (
                                  developers.map(u => {
                                    const isChecked = selectedIds.includes(u._id);
                                    return (
                                      <button
                                        key={u._id}
                                        type="button"
                                        onClick={() => toggleAssignee(u._id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                                          ${isChecked ? 'bg-brand-purple/10' : 'hover:bg-slate-800/60'}`}
                                      >
                                        {/* Avatar */}
                                        <div
                                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                          style={{
                                            background: isChecked ? theme.accent + '33' : 'rgba(51,65,85,0.7)',
                                            border: `1px solid ${isChecked ? theme.accent + '60' : 'rgba(71,85,105,0.5)'}`,
                                            color: isChecked ? theme.accent : '#94a3b8'
                                          }}
                                        >
                                          {u.avatarUrl
                                            ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                                            : u.name[0].toUpperCase()
                                          }
                                        </div>
                                        <span className={`text-[10px] font-medium flex-1 truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                                          {u.name}
                                        </span>
                                        {/* Checkbox indicator */}
                                        <div
                                          className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                          style={{
                                            background: isChecked ? theme.accent : 'transparent',
                                            border: `1.5px solid ${isChecked ? theme.accent : 'rgba(71,85,105,0.6)'}`,
                                          }}
                                        >
                                          {isChecked && (
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                              <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                                {/* Footer with count */}
                                {developers.length > 0 && (
                                  <div
                                    className="px-3 py-1.5 border-t border-slate-800 flex items-center justify-between"
                                  >
                                    <span className="text-[9px] text-slate-600">{selectedIds.length} selected</span>
                                    {selectedIds.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setColumnAssignees(prev => ({ ...prev, [colName]: [] }))}
                                        className="text-[9px] text-slate-500 hover:text-rose-400 transition-colors"
                                      >
                                        Clear all
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!quickText.trim()}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all disabled:opacity-40"
                          style={{ background: theme.accent + '33', border: `1px solid ${theme.accent}60` }}
                        >
                          Add Task
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowQuickAdd(prev => ({ ...prev, [colName]: false }))}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Cards List */}
                <div className="flex-1 flex flex-col gap-2.5 p-3 min-h-[200px] max-h-[65vh] overflow-y-auto">
                  {colCards.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2 opacity-30 select-none">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center"
                        style={{ borderColor: theme.accent }}
                      >
                        <Plus size={14} style={{ color: theme.accent }} />
                      </div>
                      <span className="text-[10px] text-slate-500">Drop cards here</span>
                    </div>
                  )}

                  {colCards.map(card => {
                    const hasDueDate = !!card.dueDate;
                    const isOverdue = hasDueDate && new Date(card.dueDate) < new Date();
                    const isDragging = draggingCardId === card._id;

                    return (
                      <div
                        key={card._id}
                        draggable={canMoveCards}
                        onDragStart={(e) => handleDragStart(e, card._id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => dispatch(setActiveCard(card))}
                        className={`group relative rounded-xl border cursor-pointer transition-all duration-150 text-left select-none
                          ${isDragging
                            ? 'opacity-30 scale-95 rotate-1'
                            : 'hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing'
                          }`}
                        style={{
                          background: isDragging ? 'rgba(30,41,59,0.3)' : 'rgba(15,23,42,0.7)',
                          borderColor: isDragging ? theme.accent : 'rgba(51,65,85,0.6)',
                          boxShadow: isDragging ? 'none' : undefined,
                        }}
                        onMouseEnter={e => {
                          if (!isDragging) e.currentTarget.style.borderColor = theme.accent + '60';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)';
                        }}
                      >
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                          style={{ background: theme.accent }}
                        />

                        <div className="pl-4 pr-3 pt-3 pb-3 flex flex-col gap-2.5">
                          {/* Labels */}
                          {card.labels && card.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {card.labels.map(l => (
                                <span
                                  key={l}
                                  className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
                                  style={{
                                    background: theme.accent + '22',
                                    color: theme.accent,
                                    border: `1px solid ${theme.accent}44`,
                                  }}
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Title */}
                          <h4 className="text-[12px] font-semibold text-slate-100 leading-snug group-hover:text-white transition-colors">
                            {card.name}
                          </h4>

                          {/* Meta row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 text-slate-500">
                              {card.description && (
                                <AlignLeft size={10} className="flex-shrink-0" />
                              )}
                              {card.comments && card.comments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={10} />
                                  <span className="text-[9px] font-medium">{card.comments.length}</span>
                                </span>
                              )}
                            </div>

                            {hasDueDate && (
                              <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border`}
                                style={isOverdue
                                  ? { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }
                                  : { background: 'rgba(51,65,85,0.5)', borderColor: 'rgba(71,85,105,0.5)', color: '#94a3b8' }
                                }
                              >
                                <Calendar size={8} />
                                {new Date(card.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {/* Assignees */}
                          {card.assignees && card.assignees.length > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex -space-x-2">
                                {card.assignees.slice(0, 4).map((assignee) => (
                                  <div
                                    key={assignee._id}
                                    title={assignee.name}
                                    className="w-6 h-6 rounded-full border-2 border-slate-950 overflow-hidden bg-slate-800 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{ boxShadow: `0 0 0 1px ${theme.accent}44` }}
                                  >
                                    {assignee.avatarUrl ? (
                                      <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span style={{ color: theme.accent }}>{assignee.name[0].toUpperCase()}</span>
                                    )}
                                  </div>
                                ))}
                                {card.assignees.length > 4 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">
                                    +{card.assignees.length - 4}
                                  </div>
                                )}
                              </div>
                              {canMoveCards && (
                                <GripVertical size={12} className="text-slate-700 group-hover:text-slate-500 transition-colors opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel p-10 rounded-2xl max-w-sm text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
              <AlertCircle size={24} className="text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-300 font-display mb-1">No Board Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click <span className="text-brand-purple font-semibold">Create Board</span> above to initialize a task board for this sprint.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      <CardDetailsModal />
    </div>
  );
};

export default KanbanBoard;
