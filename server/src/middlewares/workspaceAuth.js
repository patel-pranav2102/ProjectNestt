import Workspace from '../models/Workspace.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

// Middleware to verify if user is a member of the workspace
export const isWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.id || req.body.workspaceId;
    if (!workspaceId) {
      return next(new ForbiddenError('Workspace ID is required to access this resource.'));
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    // Check if req.user.id is in members array
    const member = workspace.members.find(m => m.userId.toString() === req.user.id);
    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace.');
    }

    // Attach workspace and user membership role to request object
    req.workspace = workspace;
    req.workspaceRole = member.role;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to verify if user has Admin privileges in the workspace
export const isWorkspaceAdmin = async (req, res, next) => {
  try {
    // Requires isWorkspaceMember to have run first
    let workspace = req.workspace;
    
    if (!workspace) {
      const workspaceId = req.params.id || req.body.workspaceId;
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new NotFoundError('Workspace not found.');
      }
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const member = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isAdmin = member && member.role === 'Admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Administrative privileges are required for this action.');
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to verify if user has Admin privileges in the workspace or has Team Lead/Admin global role
export const isWorkspaceAdminOrTeamLead = async (req, res, next) => {
  try {
    let workspace = req.workspace;
    
    if (!workspace) {
      const workspaceId = req.params.id || req.body.workspaceId;
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new NotFoundError('Workspace not found.');
      }
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const member = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isAdmin = member && member.role === 'Admin';
    const isTeamLeadOrAdminGlobal = req.user && (req.user.role === 'Team Lead' || req.user.role === 'Admin');

    if (!isOwner && !isAdmin && !isTeamLeadOrAdminGlobal) {
      throw new ForbiddenError('Administrative or Team Lead privileges are required for this action.');
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};
