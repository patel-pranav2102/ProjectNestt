import Drawing from '../models/Drawing.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. CREATE DRAWING
export const createDrawing = async (req, res, next) => {
  try {
    const { projectId, name } = req.body;

    if (!projectId) {
      throw new BadRequestError('Project ID is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Whiteboard name is required.');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(project.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to create drawings in this project.');
    }

    const drawing = new Drawing({
      projectId,
      name,
      elements: [],
      appState: {},
    });

    await drawing.save();

    res.status(201).json({
      status: 'success',
      drawing,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET PROJECT DRAWINGS
export const getProjectDrawings = async (req, res, next) => {
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
      throw new ForbiddenError('You must be a workspace member to view its whiteboard drawings.');
    }

    const drawings = await Drawing.find({ projectId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      drawings,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET DRAWING DETAILS
export const getDrawingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const drawing = await Drawing.findById(id);
    if (!drawing) {
      throw new NotFoundError('Drawing board not found.');
    }

    res.status(200).json({
      status: 'success',
      drawing,
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE DRAWING ELEMENTS
export const updateDrawing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { elements, appState } = req.body;

    const drawing = await Drawing.findById(id);
    if (!drawing) {
      throw new NotFoundError('Drawing board not found.');
    }

    if (elements && Array.isArray(elements)) drawing.elements = elements;
    if (appState) drawing.appState = appState;

    await drawing.save();

    res.status(200).json({
      status: 'success',
      drawing,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE DRAWING
export const deleteDrawing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const drawing = await Drawing.findById(id);
    if (!drawing) {
      throw new NotFoundError('Drawing board not found.');
    }

    await Drawing.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Drawing whiteboard deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
