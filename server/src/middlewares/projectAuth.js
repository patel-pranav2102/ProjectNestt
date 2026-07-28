import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Workspace from '../models/Workspace.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

// Middleware to check if user is a project member or parent workspace administrator
export const isProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.body.projectId;
    if (!projectId) {
      return next(new ForbiddenError('Project ID is required to access this resource.'));
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // 1. Check parent workspace membership status
    const workspace = await Workspace.findById(project.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Parent workspace not found.');
    }
    const isOwner = workspace.owner.toString() === req.user.id;
    const wsMember = workspace.members.find(m => m.userId.toString() === req.user.id);

    if (!wsMember && !isOwner) {
      throw new ForbiddenError('You are not authorized to view this project.');
    }

    // 2. Check or auto-enroll project member status for workspace members
    let projectMember = await ProjectMember.findOne({ projectId, userId: req.user.id });

    if (!projectMember) {
      try {
        const isWsAdmin = isOwner || (wsMember && wsMember.role === 'Admin');
        projectMember = new ProjectMember({
          projectId,
          userId: req.user.id,
          role: isWsAdmin ? 'Admin' : (wsMember?.role || 'Member'),
        });
        await projectMember.save();
      } catch (err) {
        // Handle race conditions gracefully
        projectMember = await ProjectMember.findOne({ projectId, userId: req.user.id });
      }
    }

    // Attach values to request object
    req.project = project;
    req.workspace = workspace;
    req.projectMember = projectMember;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user has Admin privileges in the project
export const isProjectAdmin = async (req, res, next) => {
  try {
    // Requires isProjectMember to have run first
    const project = req.project;
    const workspace = req.workspace;
    const projectMember = req.projectMember;

    if (!project) {
      return next(new ForbiddenError('Project check is required for this action.'));
    }

    // Check project Admin role
    const isProjAdmin = projectMember && projectMember.role === 'Admin';
    
    // Check parent workspace Admin role
    const isOwner = workspace.owner.toString() === req.user.id;
    const wsMember = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isWsAdmin = wsMember && wsMember.role === 'Admin';

    if (!isProjAdmin && !isOwner && !isWsAdmin) {
      throw new ForbiddenError('Project administration privileges are required for this action.');
    }

    next();
  } catch (error) {
    next(error);
  }
};
