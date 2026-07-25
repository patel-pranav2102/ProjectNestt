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
import { fetchProjectBoards, fetchBoardDetails, createNewCard, moveCardPosition } from '../services/kanbanService.js';
import { fetchProjectDetails } from '../services/projectService.js';
import BoardSelector from '../components/kanban/BoardSelector.jsx';
import CardDetailsModal from '../components/kanban/CardDetailsModal.jsx';
import Button from '../components/common/Button.jsx';
import { ArrowLeft, AlertCircle, Plus, Calendar, AlignLeft, CheckSquare, MessageSquare } from 'lucide-react';

const KanbanBoard = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const currentUser = useSelector(selectCurrentUser);
  const boards = useSelector(selectBoards);
  const activeBoard = useSelector(selectActiveBoard);
  const cards = useSelector(selectKanbanCards);

  // Column input fields to add quick cards
  const [columnInputs, setColumnInputs] = useState({});
  const [draggedOverCol, setDraggedOverCol] = useState(null);

  // 1. Fetch Project Details (to determine permissions)
  const { data: projData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  const project = projData?.project;
  const projectMembers = projData?.members || [];

  const isWorkspaceAdmin = activeWorkspace => activeWorkspace?.owner === currentUser?.id || 
    activeWorkspace?.members?.find(m => m.userId === currentUser?.id)?.role === 'Admin';

  const isProjMember = projectMembers.some(m => m.userId?._id === currentUser?.id);
  const isProjAdmin = projectMembers.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  const hasAdminRights = isProjAdmin; // or workspace Admin status

  // 2. Fetch Boards in Project
  const { data: boardsData, isLoading: isBoardsLoading } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => fetchProjectBoards(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (boardsData?.boards) {
      dispatch(setBoards(boardsData.boards));
      // Auto-select first board if none active
      if (boardsData.boards.length > 0 && !activeBoard) {
        dispatch(setActiveBoard(boardsData.boards[0]));
      }
    }
  }, [boardsData, dispatch, activeBoard]);

  // 3. Fetch cards inside active board
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

  // 4. Quick Card Add
  const handleAddQuickCard = async (colName, nameText) => {
    if (!nameText.trim() || !activeBoard) return;
    try {
      const data = await createNewCard({
        boardId: activeBoard._id,
        column: colName,
        name: nameText,
      });
      dispatch(addCard(data.card));
      setColumnInputs(prev => ({ ...prev, [colName]: '' }));
    } catch (err) {
      alert('Failed to create quick card.');
    }
  };

  // --- HTML5 Drag and Drop events ---
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDragOverCol = (e, colName) => {
    e.preventDefault();
    setDraggedOverCol(colName);
  };

  const handleDropOnCol = async (e, colName) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    // Find card locally
    const targetCard = cards.find(c => c._id === cardId);
    if (!targetCard || targetCard.column === colName) return;

    // Instantly update locally for UI responsiveness (Optimistic UI)
    const updatedLocally = { ...targetCard, column: colName };
    dispatch(updateCardState(updatedLocally));

    try {
      // Save changes to Mongoose database
      await moveCardPosition(cardId, { targetColumn: colName });
    } catch (err) {
      // Revert change on error
      dispatch(updateCardState(targetCard));
      alert('Failed to reorder card.');
    }
  };

  if (isBoardsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading task boards...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 text-left relative">
      
      {/* Back to Project Details */}
      <button 
        onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors self-start"
      >
        <ArrowLeft size={14} />
        <span>Back to Project Dashboard</span>
      </button>

      {/* Board Selector Dropdown Header */}
      <BoardSelector hasAdminRights={isProjAdmin || isProjMember} />

      {/* Column boards layout */}
      {activeBoard ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {activeBoard.columns?.map(colName => {
            const colCards = cards.filter(c => c.column === colName) || [];
            const isDraggedOver = draggedOverCol === colName;
            const quickText = columnInputs[colName] || '';

            return (
              <div 
                key={colName}
                onDragOver={(e) => handleDragOverCol(e, colName)}
                onDragLeave={() => setDraggedOverCol(null)}
                onDrop={(e) => handleDropOnCol(e, colName)}
                className={`glass-panel p-4 rounded-2xl flex flex-col gap-4 min-h-[60vh] transition-all duration-200 border text-left
                  ${isDraggedOver ? 'border-brand-purple bg-brand-purple/5' : 'border-slate-900/60'}`}
              >
                
                {/* Column header title */}
                <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                  <span className="text-sm font-bold text-white font-display uppercase tracking-wider">{colName}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-xs font-semibold text-slate-450">{colCards.length}</span>
                </div>

                {/* Add Quick Card Form */}
                {isProjMember && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddQuickCard(colName, quickText);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Add task title..."
                      value={quickText}
                      onChange={(e) => setColumnInputs(prev => ({ ...prev, [colName]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-850 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                    <Button type="submit" variant="secondary" className="p-1 px-2 text-xs">
                      <Plus size={12} />
                    </Button>
                  </form>
                )}

                {/* Column Cards Logs list */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-[50vh] pr-1">
                  {colCards.map(card => {
                    const hasDueDate = !!card.dueDate;
                    const isOverdue = hasDueDate && new Date(card.dueDate) < new Date();
                    
                    return (
                      <div
                        key={card._id}
                        draggable={isProjMember}
                        onDragStart={(e) => handleDragStart(e, card._id)}
                        onClick={() => dispatch(setActiveCard(card))}
                        className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 cursor-pointer transition-all flex flex-col gap-2.5 text-left active:cursor-grabbing hover:scale-[1.01]"
                      >
                        {/* Labels list */}
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {card.labels.map(l => (
                              <span 
                                key={l}
                                className="px-1.5 py-0.5 rounded bg-brand-purple/10 border border-brand-purple/20 text-[9px] font-semibold text-brand-purple uppercase tracking-wider"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-white leading-relaxed">{card.name}</h4>

                        {/* Task parameters */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-slate-500 scale-90">
                            {card.description && <AlignLeft size={10} />}
                            {card.comments && card.comments.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare size={10} />
                                <span className="text-[9px]">{card.comments.length}</span>
                              </span>
                            )}
                          </div>

                          {/* Due Date Indicator */}
                          {hasDueDate && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider flex items-center gap-1 scale-95
                              ${isOverdue 
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                                : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                              <Calendar size={8} />
                              <span>{new Date(card.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                        </div>

                        {/* Assignees visual bubbles stack */}
                        {card.assignees && card.assignees.length > 0 && (
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {card.assignees.map((assignee) => (
                              <div 
                                key={assignee._id}
                                className="inline-block h-5.5 w-5.5 rounded-full overflow-hidden border border-slate-950 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                title={assignee.name}
                              >
                                {assignee.avatarUrl ? (
                                  <img src={assignee.avatarUrl} alt={assignee.name} className="w-full h-full object-cover" />
                                ) : (
                                  assignee.name[0].toUpperCase()
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto text-center flex flex-col items-center gap-3 py-16">
          <AlertCircle size={36} className="text-slate-650" />
          <h3 className="text-lg font-bold text-slate-400 font-display">No Kanban Board Configured</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Please click "Create Board" above to initialize a task board space for this project sprint.</p>
        </div>
      )}

      {/* Card Details Modal Sheet */}
      <CardDetailsModal />

    </div>
  );
};

export default KanbanBoard;
