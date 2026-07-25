import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';
import { logActivity } from '../utils/activityLogger.js';

// 1. CREATE PROJECT
export const createProject = async (req, res, next) => {
  try {
    const { workspaceId, name, description, teamId } = req.body;

    if (!workspaceId) {
      throw new BadRequestError('Workspace ID is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Project name is required.');
    }

    // Verify workspace exists and user is admin
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const wsMember = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isWsAdmin = wsMember && wsMember.role === 'Admin';

    if (!isOwner && !isWsAdmin) {
      throw new ForbiddenError('Only workspace administrators can create projects.');
    }

    // Create Project
    const project = new Project({
      workspaceId,
      name,
      description,
      teamId: teamId || null,
    });

    await project.save();

    // Register creator as Project Admin
    const projectMember = new ProjectMember({
      projectId: project._id,
      userId: req.user.id,
      role: 'Admin',
    });

    await projectMember.save();

    // Log project creation activity
    await logActivity(workspaceId, project._id, req.user.id, 'created the project', {
      projectName: project.name,
    });

    res.status(201).json({
      status: 'success',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET WORKSPACE PROJECTS
export const getWorkspaceProjects = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Check workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You must be a workspace member to view its projects.');
    }

    const projects = await Project.find({ workspaceId })
      .populate('teamId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      projects,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET PROJECT DETAILS
export const getProjectDetails = async (req, res, next) => {
  try {
    const project = req.project; // Attached by isProjectMember middleware
    
    // Fetch populated project memberships
    const members = await ProjectMember.find({ projectId: project._id })
      .populate('userId', 'name email avatarUrl role status');

    res.status(200).json({
      status: 'success',
      project: {
        _id: project._id,
        workspaceId: project.workspaceId,
        name: project.name,
        description: project.description,
        teamId: project.teamId,
        isArchived: project.isArchived,
        createdAt: project.createdAt,
      },
      members,
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE PROJECT
export const updateProject = async (req, res, next) => {
  try {
    const { name, description, teamId } = req.body;
    const project = req.project; // Attached by middleware
    
    if (name !== undefined && name.trim() === '') {
      throw new BadRequestError('Project name cannot be empty.');
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (teamId !== undefined) project.teamId = teamId || null;

    await project.save();

    res.status(200).json({
      status: 'success',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// 5. ARCHIVE PROJECT
export const archiveProject = async (req, res, next) => {
  try {
    const { isArchived } = req.body;
    const project = req.project; // Attached by middleware

    project.isArchived = isArchived !== undefined ? isArchived : !project.isArchived;
    await project.save();

    res.status(200).json({
      status: 'success',
      message: `Project has been ${project.isArchived ? 'archived' : 'unarchived'} successfully.`,
      project,
    });
  } catch (error) {
    next(error);
  }
};

// 6. ADD PROJECT MEMBER
export const addProjectMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = req.project; // Attached by middleware
    const workspace = req.workspace; // Parent workspace attached by middleware

    if (!userId) {
      throw new BadRequestError('User ID is required.');
    }

    // 1. Verify user is in parent workspace
    const isWsMember = workspace.members.some(m => m.userId.toString() === userId);
    if (!isWsMember) {
      throw new BadRequestError('User must be a member of the parent workspace to join this project.');
    }

    // 2. Check if user is already in project members
    const existingMember = await ProjectMember.findOne({ projectId: project._id, userId });
    if (existingMember) {
      throw new BadRequestError('User is already a member of this project.');
    }

    // Register project member
    const newMember = new ProjectMember({
      projectId: project._id,
      userId,
      role: role || 'Member',
    });

    await newMember.save();

    res.status(200).json({
      status: 'success',
      message: 'Member added to project successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 7. REMOVE PROJECT MEMBER
export const removeProjectMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const project = req.project; // Attached by middleware

    // Delete record
    const deleted = await ProjectMember.findOneAndDelete({ projectId: project._id, userId });
    if (!deleted) {
      throw new NotFoundError('User is not a member of this project.');
    }

    res.status(200).json({
      status: 'success',
      message: 'Member removed from project successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 8. DELETE PROJECT
export const deleteProject = async (req, res, next) => {
  try {
    const project = req.project; // Attached by middleware

    // Delete project metadata
    await Project.findByIdAndDelete(project._id);

    // Delete all linked memberships
    await ProjectMember.deleteMany({ projectId: project._id });

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
