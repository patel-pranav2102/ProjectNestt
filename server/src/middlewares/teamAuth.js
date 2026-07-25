import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

// Middleware to check if user is a Team Lead or Parent Workspace Admin/Owner
export const isTeamLeadOrWorkspaceAdmin = async (req, res, next) => {
  try {
    const teamId = req.params.id || req.body.teamId;
    if (!teamId) {
      return next(new ForbiddenError('Team ID is required for this action.'));
    }

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found.');
    }

    // 1. Check if user is Team Lead
    const teamMember = team.members.find(m => m.userId.toString() === req.user.id);
    const isLead = teamMember && teamMember.role === 'Lead';

    // 2. Check if user is Workspace Owner or Admin
    const workspace = await Workspace.findById(team.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Parent workspace not found.');
    }
    
    const isOwner = workspace.owner.toString() === req.user.id;
    const wsMember = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isWsAdmin = wsMember && wsMember.role === 'Admin';

    if (!isLead && !isOwner && !isWsAdmin) {
      throw new ForbiddenError('Administrative or Team Lead privileges are required for this action.');
    }

    // Attach entities to request
    req.team = team;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};
