import FileModel from '../models/File.js';
import Workspace from '../models/Workspace.js';
import { NotFoundError } from '../utils/errors.js';

// 1. GET ALL WORKSPACE FILES
export const getWorkspaceFiles = async (req, res, next) => {
  try {
    const workspaceId = req.workspace._id;

    const files = await FileModel.find({ workspaceId })
      .populate('uploadedBy', 'name email avatarUrl')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      files,
    });
  } catch (error) {
    next(error);
  }
};

// 2. REGISTER FILE MANUALLY
export const registerFile = async (req, res, next) => {
  try {
    const { workspaceId, projectId, name, url, fileType, size } = req.body;

    const file = new FileModel({
      workspaceId,
      projectId: projectId || null,
      uploadedBy: req.user.id,
      name,
      url,
      fileType,
      size,
    });

    await file.save();

    res.status(201).json({
      status: 'success',
      file,
    });
  } catch (error) {
    next(error);
  }
};
