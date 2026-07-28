import FileModel from '../models/File.js';
import Workspace from '../models/Workspace.js';
import { uploadBuffer } from '../services/cloudinary.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

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

// 2. REGISTER FILE MANUALLY (metadata only, URL already known)
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

// 3. UPLOAD FILE (accepts actual file buffer, uploads to Cloudinary, saves metadata)
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file provided. Please attach a file to upload.');
    }

    const { workspaceId, projectId } = req.body;

    if (!workspaceId) {
      throw new BadRequestError('workspaceId is required.');
    }

    // Determine file type category by checking MIME type and extension
    let fileType = 'document';
    const mime = (req.file.mimetype || '').toLowerCase();
    const filename = (req.file.originalname || '').toLowerCase();
    const ext = filename.split('.').pop();

    if (mime.startsWith('image/')) {
      fileType = 'image';
    } else if (mime.startsWith('video/')) {
      fileType = 'video';
    } else if (mime === 'application/pdf' || ext === 'pdf') {
      fileType = 'pdf';
    } else if (
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv') ||
      ['xls', 'xlsx', 'csv'].includes(ext)
    ) {
      fileType = 'spreadsheet';
    } else if (
      mime.includes('presentation') ||
      mime.includes('powerpoint') ||
      ['ppt', 'pptx'].includes(ext)
    ) {
      fileType = 'presentation';
    }

    // Upload buffer to Cloudinary
    const uploadResult = await uploadBuffer(
      req.file.buffer,
      'projectnest/files',
      req.file.mimetype
    );

    // Save file record
    const fileRecord = new FileModel({
      workspaceId,
      projectId: projectId || null,
      uploadedBy: req.user.id,
      name: req.file.originalname,
      url: uploadResult.url,
      fileType,
      size: req.file.size || 0,
    });

    await fileRecord.save();

    // Return populated file record
    const populated = await FileModel.findById(fileRecord._id)
      .populate('uploadedBy', 'name email avatarUrl')
      .populate('projectId', 'name');

    res.status(201).json({
      status: 'success',
      file: populated,
    });
  } catch (error) {
    next(error);
  }
};
