import Board from '../models/Board.js';
import Card from '../models/Card.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. CREATE BOARD
export const createBoard = async (req, res, next) => {
  try {
    const { projectId, name, columns } = req.body;

    if (!projectId) {
      throw new BadRequestError('Project ID is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Board name is required.');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Parent project not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(project.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to create boards in this project.');
    }

    const board = new Board({
      projectId,
      name,
      columns: columns && Array.isArray(columns) ? columns : ['To Do', 'In Progress', 'Testing', 'Done'],
    });

    await board.save();

    res.status(201).json({
      status: 'success',
      board,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET PROJECT BOARDS
export const getProjectBoards = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(project.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You must be a member of the workspace to view boards.');
    }

    const boards = await Board.find({ projectId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      boards,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET BOARD DETAILS (Populates associated cards)
export const getBoardDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);
    if (!board) {
      throw new NotFoundError('Board not found.');
    }

    // Find all cards linked to board
    const cards = await Card.find({ boardId: id })
      .populate('assignees', 'name email avatarUrl status')
      .sort({ position: 1 });

    res.status(200).json({
      status: 'success',
      board,
      cards,
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE BOARD DETAILS
export const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, columns } = req.body;

    const board = await Board.findById(id);
    if (!board) {
      throw new NotFoundError('Board not found.');
    }

    if (name) board.name = name;
    if (columns && Array.isArray(columns)) board.columns = columns;

    await board.save();

    res.status(200).json({
      status: 'success',
      board,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE BOARD (Erases board + matching cards)
export const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);
    if (!board) {
      throw new NotFoundError('Board not found.');
    }

    await Board.findByIdAndDelete(id);

    // Delete associated cards
    await Card.deleteMany({ boardId: id });

    res.status(200).json({
      status: 'success',
      message: 'Board and all its cards deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
