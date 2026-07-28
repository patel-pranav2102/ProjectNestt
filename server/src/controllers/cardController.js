import Card from '../models/Card.js';
import Board from '../models/Board.js';
import Project from '../models/Project.js';
import { emitNotification } from '../sockets/chatSocket.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// Helper to send real-time notification to assigned developers
const notifyAssigneesOfTask = async (io, assigneeIds, cardName, workspaceId, triggeredById) => {
  if (!io || !assigneeIds || !Array.isArray(assigneeIds) || assigneeIds.length === 0) return;

  for (const assigneeId of assigneeIds) {
    const recipientStr = assigneeId.toString();
    const triggerStr = triggeredById?.toString();

    // Skip self-assignment notifications
    if (recipientStr === triggerStr) continue;

    try {
      await emitNotification(io, {
        recipient: assigneeId,
        type: 'task_assigned',
        message: `You were assigned to task "${cardName}"`,
        workspaceId: workspaceId || null,
        triggeredBy: triggeredById,
      });
    } catch (err) {
      console.error('[notifyAssigneesOfTask] error:', err.message);
    }
  }
};

// 1. CREATE CARD
export const createCard = async (req, res, next) => {
  try {
    const { boardId, column, name, description, assignees, dueDate, labels } = req.body;

    if (!boardId) {
      throw new BadRequestError('Board ID is required.');
    }
    if (!column) {
      throw new BadRequestError('Target column is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Card title is required.');
    }

    const board = await Board.findById(boardId);
    if (!board) {
      throw new NotFoundError('Parent board not found.');
    }

    // Determine card position index in column
    const cardsInColCount = await Card.countDocuments({ boardId, column });

    const card = new Card({
      boardId,
      column,
      name,
      description: description || '',
      assignees: assignees || [],
      dueDate: dueDate || null,
      labels: labels || [],
      position: cardsInColCount,
      activityLog: [{
        userId: req.user.id,
        action: 'Created',
        details: `Task card created in column "${column}"`,
      }]
    });

    await card.save();
    const populated = await card.populate('assignees', 'name email avatarUrl');

    // Notify assigned developers in real-time
    if (assignees && assignees.length > 0) {
      try {
        const project = await Project.findById(board.projectId);
        const io = req.app.get('io');
        await notifyAssigneesOfTask(io, assignees, card.name, project?.workspaceId, req.user.id);
      } catch (notifErr) {
        console.error('Failed to send task assignment notification:', notifErr.message);
      }
    }

    res.status(201).json({
      status: 'success',
      card: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET CARD DETAILS
export const getCardDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl role');

    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    res.status(200).json({
      status: 'success',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// 3. UPDATE CARD DETAILS
export const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, dueDate, labels, assignees } = req.body;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    let changedDetails = [];
    if (name) {
      changedDetails.push(`Title changed to "${name}"`);
      card.name = name;
    }
    if (description !== undefined) {
      changedDetails.push('Description updated');
      card.description = description;
    }
    if (dueDate !== undefined) {
      changedDetails.push(`Due date changed to ${dueDate ? new Date(dueDate).toLocaleDateString() : 'None'}`);
      card.dueDate = dueDate || null;
    }
    if (labels && Array.isArray(labels)) {
      changedDetails.push(`Labels updated to: ${labels.join(', ')}`);
      card.labels = labels;
    }

    let newAssigneeIds = [];
    if (assignees && Array.isArray(assignees)) {
      const oldAssigneeStrs = card.assignees.map(a => a.toString());
      newAssigneeIds = assignees.filter(aId => !oldAssigneeStrs.includes(aId.toString()));
      card.assignees = assignees;
      changedDetails.push('Assignees updated');
    }

    if (changedDetails.length > 0) {
      card.activityLog.push({
        userId: req.user.id,
        action: 'Updated details',
        details: changedDetails.join(', '),
      });
    }

    await card.save();

    // Send notifications to newly assigned members
    if (newAssigneeIds.length > 0) {
      try {
        const board = await Board.findById(card.boardId);
        const project = board ? await Project.findById(board.projectId) : null;
        const io = req.app.get('io');
        await notifyAssigneesOfTask(io, newAssigneeIds, card.name, project?.workspaceId, req.user.id);
      } catch (notifErr) {
        console.error('Failed to send update assignment notification:', notifErr.message);
      }
    }

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl role');

    res.status(200).json({
      status: 'success',
      card: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 4. MOVE CARD (Column drag and drop reordering)
export const moveCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetColumn, targetPosition } = req.body;

    if (!targetColumn) {
      throw new BadRequestError('Target column is required.');
    }

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    const sourceColumn = card.column;
    card.column = targetColumn;
    card.position = targetPosition || 0;

    card.activityLog.push({
      userId: req.user.id,
      action: 'Moved',
      details: `Moved task card from column "${sourceColumn}" to "${targetColumn}"`,
    });

    await card.save();

    res.status(200).json({
      status: 'success',
      card,
    });
  } catch (error) {
    next(error);
  }
};

// 5. ASSIGN OR UNASSIGN MEMBER (Toggle single assignment)
export const assignMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new BadRequestError('User ID is required.');
    }

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    const userIndex = card.assignees.indexOf(userId);
    let isNewlyAssigned = false;
    let actionDetails = '';

    if (userIndex !== -1) {
      // Unassign user
      card.assignees.splice(userIndex, 1);
      actionDetails = 'Removed assignee';
    } else {
      // Assign user
      card.assignees.push(userId);
      isNewlyAssigned = true;
      actionDetails = 'Assigned member';
    }

    card.activityLog.push({
      userId: req.user.id,
      action: 'Assignment update',
      details: actionDetails,
    });

    await card.save();

    // Send real-time notification if user was newly assigned
    if (isNewlyAssigned) {
      try {
        const board = await Board.findById(card.boardId);
        const project = board ? await Project.findById(board.projectId) : null;
        const io = req.app.get('io');
        await notifyAssigneesOfTask(io, [userId], card.name, project?.workspaceId, req.user.id);
      } catch (notifErr) {
        console.error('Failed to send assignMember notification:', notifErr.message);
      }
    }

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl role');

    res.status(200).json({
      status: 'success',
      card: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 6. ADD COMMENT
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      throw new BadRequestError('Comment text is required.');
    }

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    card.comments.push({
      userId: req.user.id,
      text,
    });

    card.activityLog.push({
      userId: req.user.id,
      action: 'Commented',
      details: 'Added a task comment',
    });

    await card.save();

    // Send real-time notification to card assignees when a comment is added
    if (card.assignees && card.assignees.length > 0) {
      try {
        const board = await Board.findById(card.boardId);
        const project = board ? await Project.findById(board.projectId) : null;
        const io = req.app.get('io');

        for (const assigneeId of card.assignees) {
          if (assigneeId.toString() !== req.user.id.toString()) {
            await emitNotification(io, {
              recipient: assigneeId,
              type: 'card_comment',
              message: `New comment on task "${card.name}"`,
              workspaceId: project?.workspaceId || null,
              triggeredBy: req.user.id,
            });
          }
        }
      } catch (notifErr) {
        console.error('Failed to send card comment notification:', notifErr.message);
      }
    }

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl role');

    res.status(200).json({
      status: 'success',
      card: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 7. DELETE COMMENT
export const deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    const commentIndex = card.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) {
      throw new NotFoundError('Comment not found.');
    }

    // Verify comment owner or Admin
    if (card.comments[commentIndex].userId.toString() !== req.user.id && req.user.role !== 'Admin') {
      throw new ForbiddenError('You do not have permission to delete this comment.');
    }

    card.comments.splice(commentIndex, 1);
    await card.save();

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl role');

    res.status(200).json({
      status: 'success',
      card: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 8. DELETE CARD
export const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) {
      throw new NotFoundError('Card not found.');
    }

    await Card.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Card deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
