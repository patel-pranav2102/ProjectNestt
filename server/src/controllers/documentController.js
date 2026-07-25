import Document from '../models/Document.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. CREATE DOCUMENT
export const createDocument = async (req, res, next) => {
  try {
    const { projectId, title, content } = req.body;

    if (!projectId) {
      throw new BadRequestError('Project ID is required.');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(project.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to create notes in this project.');
    }

    const document = new Document({
      projectId,
      title: title || 'Untitled Document',
      content: content || '',
      versions: [{
        content: content || '',
        author: req.user.id,
      }]
    });

    await document.save();

    res.status(201).json({
      status: 'success',
      document,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET PROJECT DOCUMENTS
export const getProjectDocuments = async (req, res, next) => {
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
      throw new ForbiddenError('You must be a workspace member to view its documents.');
    }

    const documents = await Document.find({ projectId })
      .select('title content createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET DOCUMENT DETAILS (Populates author profiles in versions history list)
export const getDocumentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id)
      .populate('versions.author', 'name email avatarUrl');

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    res.status(200).json({
      status: 'success',
      document,
    });
  } catch (error) {
    next(error);
  }
};

// 4. SAVE NEW VERSION SNAPSHOT
export const saveVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      throw new BadRequestError('Content is required to capture a snapshot.');
    }

    const document = await Document.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    // Push new snapshot to versions array
    document.versions.push({
      content,
      author: req.user.id,
    });
    
    // Also save current active content
    document.content = content;
    await document.save();

    const populated = await Document.findById(document._id)
      .populate('versions.author', 'name email avatarUrl');

    res.status(200).json({
      status: 'success',
      document: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 5. RESTORE SPECIFIC VERSION SNAPSHOT
export const restoreVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;

    if (!versionId) {
      throw new BadRequestError('Version ID is required to restore.');
    }

    const document = await Document.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    const version = document.versions.id(versionId);
    if (!version) {
      throw new NotFoundError('Selected version snapshot not found.');
    }

    // Set content to matching snapshot
    document.content = version.content;

    // Log the restore event by creating a new version entry
    document.versions.push({
      content: version.content,
      author: req.user.id,
      createdAt: new Date(),
    });

    await document.save();

    const populated = await Document.findById(document._id)
      .populate('versions.author', 'name email avatarUrl');

    res.status(200).json({
      status: 'success',
      document: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 6. DELETE DOCUMENT
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    await Document.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 7. UPDATE DOCUMENT DETAILS (Title & Content)
export const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;

    await document.save();

    res.status(200).json({
      status: 'success',
      document,
    });
  } catch (error) {
    next(error);
  }
};
