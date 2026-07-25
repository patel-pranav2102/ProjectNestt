import Team from '../models/Team.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. CREATE TEAM
export const createTeam = async (req, res, next) => {
  try {
    const { workspaceId, name, description } = req.body;

    if (!workspaceId) {
      throw new BadRequestError('Workspace ID is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Team name is required.');
    }

    // Verify parent workspace exists and user has Admin rights
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Parent workspace not found.');
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const wsMember = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isWsAdmin = wsMember && wsMember.role === 'Admin';

    if (!isOwner && !isWsAdmin) {
      throw new ForbiddenError('Only workspace administrators can create teams.');
    }

    // Create team and set creator as Admin or Lead based on system role
    const creatorRole = req.user.role === 'Admin' ? 'Admin' : 'Lead';
    const team = new Team({
      workspaceId,
      name,
      description: description || '',
      members: [{ userId: req.user.id, role: creatorRole }],
    });

    await team.save();

    res.status(201).json({
      status: 'success',
      team,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET WORKSPACE TEAMS
export const getWorkspaceTeams = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Verify user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You must be a workspace member to view its teams.');
    }

    const teams = await Team.find({ workspaceId })
      .populate('members.userId', 'name email avatarUrl role status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      teams,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET TEAM DETAILS
export const getTeamDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('workspaceId', 'name owner')
      .populate('members.userId', 'name email avatarUrl role status');

    if (!team) {
      throw new NotFoundError('Team not found.');
    }

    // Verify current user is a member of the parent workspace
    const workspace = await Workspace.findById(team.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to view this team details.');
    }

    res.status(200).json({
      status: 'success',
      team,
    });
  } catch (error) {
    next(error);
  }
};

// 4. ADD TEAM MEMBER
export const addTeamMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const team = req.team; // Attached by isTeamLeadOrWorkspaceAdmin middleware
    const workspace = req.workspace; // Attached by middleware

    if (!userId) {
      throw new BadRequestError('User ID is required.');
    }

    // 1. Verify user is in parent workspace
    const isWsMember = workspace.members.some(m => m.userId.toString() === userId);
    if (!isWsMember) {
      throw new BadRequestError('User must be a member of the parent workspace to join this team.');
    }

    // 2. Check if user is already in team
    const isTeamMember = team.members.some(m => m.userId.toString() === userId);
    if (isTeamMember) {
      throw new BadRequestError('User is already a member of this team.');
    }

    // Add member
    team.members.push({ userId, role: role || 'Member' });
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Member added to team successfully.',
      team,
    });
  } catch (error) {
    next(error);
  }
};

// 5. REMOVE TEAM MEMBER
export const removeTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const team = req.team; // Attached by isTeamLeadOrWorkspaceAdmin middleware

    // Check if user is in team
    const memberIndex = team.members.findIndex(m => m.userId.toString() === userId);
    if (memberIndex === -1) {
      throw new NotFoundError('User is not a member of this team.');
    }

    // Pull member
    team.members.splice(memberIndex, 1);
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Member removed from team successfully.',
      team,
    });
  } catch (error) {
    next(error);
  }
};

// 6. UPDATE TEAM DETAILS
export const updateTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const team = req.team; // Attached by middleware

    if (name !== undefined && name.trim() === '') {
      throw new BadRequestError('Team name cannot be empty.');
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;

    await team.save();

    res.status(200).json({
      status: 'success',
      team,
    });
  } catch (error) {
    next(error);
  }
};

// 7. DELETE TEAM
export const deleteTeam = async (req, res, next) => {
  try {
    const team = req.team; // Attached by middleware
    
    await Team.findByIdAndDelete(team._id);

    res.status(200).json({
      status: 'success',
      message: 'Team deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
