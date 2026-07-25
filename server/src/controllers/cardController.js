import Card from '../models/Card.js';
import Board from '../models/Board.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

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

    res.status(201).json({
      status: 'success',
      card,
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
      .populate('activityLog.userId', 'name email avatarUrl');

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
    const { name, description, dueDate, labels } = req.body;

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

    if (changedDetails.length > 0) {
      card.activityLog.push({
        userId: req.user.id,
        action: 'Updated details',
        details: changedDetails.join(', '),
      });
    }

    await card.save();

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl');

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

// 5. ASSIGN OR UNASSIGN MEMBER
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
    let actionDetails = '';
    
    if (userIndex !== -1) {
      // Unassign user
      card.assignees.splice(userIndex, 1);
      actionDetails = 'Removed assignee';
    } else {
      // Assign user
      card.assignees.push(userId);
      actionDetails = 'Assigned member';
    }

    card.activityLog.push({
      userId: req.user.id,
      action: 'Assignment update',
      details: actionDetails,
    });

    await card.save();

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl');

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

    const populated = await Card.findById(card._id)
      .populate('assignees', 'name email avatarUrl status')
      .populate('comments.userId', 'name email avatarUrl')
      .populate('activityLog.userId', 'name email avatarUrl');

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
      .populate('activityLog.userId', 'name email avatarUrl');

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
