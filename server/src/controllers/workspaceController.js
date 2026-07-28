import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import Document from '../models/Document.js';
import Drawing from '../models/Drawing.js';
import Channel from '../models/Channel.js';
import ActivityModel from '../models/Activity.js';
import FileModel from '../models/File.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logActivity } from '../utils/activityLogger.js';
import { emitNotification } from '../sockets/chatSocket.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from '../utils/errors.js';

// 1. CREATE WORKSPACE
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      throw new BadRequestError('Workspace name is required.');
    }

    const workspace = new Workspace({
      name,
      description,
      owner: req.user.id,
      members: [{ userId: req.user.id, role: 'Admin' }],
    });

    await workspace.save();

    // Log workspace creation activity
    await logActivity(workspace._id, null, req.user.id, 'created the workspace', {
      workspaceName: workspace.name,
    });

    res.status(201).json({
      status: 'success',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET MY WORKSPACES
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({ 'members.userId': req.user.id })
      .populate('owner', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET WORKSPACE DETAILS
export const getWorkspaceDetails = async (req, res, next) => {
  try {
    // req.workspace is attached by isWorkspaceMember middleware
    const workspace = await Workspace.findById(req.workspace._id)
      .populate('owner', 'name email avatarUrl')
      .populate('members.userId', 'name email avatarUrl role status');

    res.status(200).json({
      status: 'success',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE WORKSPACE
export const updateWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (name !== undefined && name.trim() === '') {
      throw new BadRequestError('Workspace name cannot be empty.');
    }

    const workspace = req.workspace; // attached by isWorkspaceMember

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;

    await workspace.save();

    res.status(200).json({
      status: 'success',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// 5. JOIN WORKSPACE VIA INVITE CODE
export const joinWorkspace = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      throw new BadRequestError('Invite code is required.');
    }

    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      throw new NotFoundError('Invalid invite code. Workspace not found.');
    }

    // Check if user is already a member
    const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (isMember) {
      throw new BadRequestError('You are already a member of this workspace.');
    }

    // Add user as a Member
    workspace.members.push({ userId: req.user.id, role: 'Member' });
    await workspace.save();

    // Trigger notification for joining workspace
    const io = req.app.get('io');
    if (io) {
      try {
        await emitNotification(io, {
          recipient: req.user.id,
          type: 'workspace_joined',
          message: `You have successfully joined the workspace: "${workspace.name}".`,
          link: `/workspace/${workspace._id}`,
          workspaceId: workspace._id,
          triggeredBy: req.user.id,
        });
      } catch (err) {
        console.error('Failed to send workspace joined notification:', err.message);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully joined workspace: ${workspace.name}`,
      workspaceId: workspace._id,
    });
  } catch (error) {
    next(error);
  }
};

// Invite a member to the workspace via notification invite
export const inviteWorkspaceMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const workspaceId = req.params.id;

    if (!email) {
      throw new BadRequestError('Email address is required.');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    // Find the user by email
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      throw new NotFoundError('User with this email address was not found.');
    }

    // Check if the user is already a member
    const isMember = workspace.members.some(m => m.userId.toString() === userToInvite._id.toString());
    if (isMember) {
      throw new BadRequestError('User is already a member of this workspace.');
    }

    // Check if there is already a pending invitation
    const existingInvite = await Notification.findOne({
      recipient: userToInvite._id,
      type: 'workspace_invite',
      workspaceId: workspace._id,
      isRead: false,
    });
    if (existingInvite) {
      throw new BadRequestError('An invitation to this workspace is already pending for this user.');
    }

    // Get the name of the inviter
    const inviter = await User.findById(req.user.id);
    const inviterName = inviter ? inviter.name : 'An Administrator';

    // Create and emit the notification
    const io = req.app.get('io');
    if (io) {
      try {
        await emitNotification(io, {
          recipient: userToInvite._id,
          type: 'workspace_invite',
          message: `You have been invited to join the workspace: "${workspace.name}" by ${inviterName}.`,
          link: `/dashboard`,
          workspaceId: workspace._id,
          triggeredBy: req.user.id,
        });
      } catch (err) {
        console.error('Failed to emit workspace invite notification:', err.message);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Invitation successfully sent to ${userToInvite.name}.`,
    });
  } catch (error) {
    next(error);
  }
};

// 6. LEAVE WORKSPACE
export const leaveWorkspace = async (req, res, next) => {
  try {
    const workspace = req.workspace; // attached by isWorkspaceMember

    // Owner cannot leave workspace
    if (workspace.owner.toString() === req.user.id) {
      throw new BadRequestError('The owner cannot leave the workspace. You must transfer ownership or delete the workspace.');
    }

    // Remove member from array
    workspace.members = workspace.members.filter(m => m.userId.toString() !== req.user.id);
    await workspace.save();

    res.status(200).json({
      status: 'success',
      message: 'You have left the workspace.',
    });
  } catch (error) {
    next(error);
  }
};

// 7. REGENERATE INVITE CODE
export const regenerateInviteCode = async (req, res, next) => {
  try {
    const workspace = req.workspace; // attached by isWorkspaceAdmin

    workspace.inviteCode = crypto.randomBytes(4).toString('hex');
    await workspace.save();

    res.status(200).json({
      status: 'success',
      inviteCode: workspace.inviteCode,
      message: 'Invite code regenerated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 8. DELETE WORKSPACE
export const deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = req.workspace; // attached by isWorkspaceAdmin

    // Only actual owner (not standard Admin) can delete workspace
    if (workspace.owner.toString() !== req.user.id) {
      throw new ForbiddenError('Only the workspace owner can delete the workspace.');
    }

    await Workspace.findByIdAndDelete(workspace._id);

    res.status(200).json({
      status: 'success',
      message: 'Workspace deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 9. GET WORKSPACE STATS
export const getWorkspaceStats = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const projects = await Project.find({ workspaceId }).select('_id name');
    const projectIds = projects.map(p => p._id);

    const projectsCount = projects.length;
    const teamsCount = await Team.countDocuments({ workspaceId });
    const membersCount = workspace.members.length;

    // Kanban stats
    const boards = await Board.find({ projectId: { $in: projectIds } }).select('_id');
    const boardIds = boards.map(b => b._id);

    const totalTasks = await Card.countDocuments({ boardId: { $in: boardIds } });
    const completedTasks = await Card.countDocuments({ boardId: { $in: boardIds }, column: { $regex: /done|completed|finished|closed/i } });
    const pendingTasks = totalTasks - completedTasks;

    // Recent updates lists
    const recentDocuments = await Document.find({ projectId: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('title projectId updatedAt');

    const recentDrawings = await Drawing.find({ projectId: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('title projectId updatedAt');

    res.status(200).json({
      status: 'success',
      stats: {
        projectsCount,
        teamsCount,
        membersCount,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks
        },
        recentDocuments,
        recentDrawings
      }
    });
  } catch (error) {
    next(error);
  }
};

// 10. GLOBAL WORKSPACE SEARCH
export const searchWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { q, type, creator, startDate, endDate } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    const regex = q ? new RegExp(q, 'i') : null;

    // Date range filter builder
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    const hasDate = Object.keys(dateFilter).length > 0;

    // Pre-fetch project ids scoped to this workspace
    const projectIds = (await Project.find({ workspaceId }).select('_id')).map(p => p._id);

    const results = { projects: [], documents: [], drawings: [], cards: [], channels: [] };
    const jobs = [];

    // 1. Projects
    if (!type || type === 'project') {
      const filter = { workspaceId };
      if (regex) filter.name = regex;
      if (creator) filter.owner = creator;
      if (hasDate) filter.createdAt = dateFilter;
      jobs.push(
        Project.find(filter).populate('owner', 'name email avatarUrl')
          .then(docs => { results.projects = docs; })
      );
    }

    // 2. Documents
    if (!type || type === 'document') {
      const filter = { projectId: { $in: projectIds } };
      if (regex) filter.title = regex;
      if (creator) filter.creator = creator;
      if (hasDate) filter.createdAt = dateFilter;
      jobs.push(
        Document.find(filter).populate('creator', 'name email avatarUrl')
          .then(docs => { results.documents = docs; })
      );
    }

    // 3. Drawings
    if (!type || type === 'drawing') {
      const filter = { projectId: { $in: projectIds } };
      if (regex) filter.title = regex;
      if (creator) filter.creator = creator;
      if (hasDate) filter.createdAt = dateFilter;
      jobs.push(
        Drawing.find(filter).populate('creator', 'name email avatarUrl')
          .then(docs => { results.drawings = docs; })
      );
    }

    // 4. Kanban Cards
    if (!type || type === 'card') {
      const boardIds = (await Board.find({ projectId: { $in: projectIds } }).select('_id')).map(b => b._id);
      const filter = { boardId: { $in: boardIds } };
      if (regex) filter.$or = [{ name: regex }, { labels: regex }];
      if (creator) filter.assignees = creator;
      if (hasDate) filter.createdAt = dateFilter;
      jobs.push(
        Card.find(filter).populate('assignees', 'name email avatarUrl')
          .then(docs => { results.cards = docs; })
      );
    }

    // 5. Channels
    if (!type || type === 'channel') {
      const filter = { workspaceId };
      if (regex) filter.name = regex;
      if (hasDate) filter.createdAt = dateFilter;
      jobs.push(
        Channel.find(filter)
          .then(docs => { results.channels = docs; })
      );
    }

    await Promise.all(jobs);

    res.status(200).json({ status: 'success', results });
  } catch (error) {
    next(error);
  }
};

// 11. UPDATE MEMBER ROLE (Admin only)
export const updateMemberRole = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!['Admin', 'Member'].includes(role)) {
      throw new BadRequestError('Role must be either "Admin" or "Member".');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    // Prevent changing the owner's role
    if (workspace.owner.toString() === userId) {
      throw new ForbiddenError('The workspace owner role cannot be changed.');
    }

    const member = workspace.members.find(m => m.userId.toString() === userId);
    if (!member) throw new NotFoundError('Member not found in this workspace.');

    member.role = role;
    await workspace.save();

    const updated = await Workspace.findById(workspaceId)
      .populate('members.userId', 'name email avatarUrl');

    res.status(200).json({ status: 'success', workspace: updated });
  } catch (error) {
    next(error);
  }
};

// 12. REMOVE MEMBER FROM WORKSPACE (Admin only)
export const removeMember = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    // Prevent removing the workspace owner
    if (workspace.owner.toString() === userId) {
      throw new ForbiddenError('The workspace owner cannot be removed.');
    }

    const memberIndex = workspace.members.findIndex(m => m.userId.toString() === userId);
    if (memberIndex === -1) throw new NotFoundError('Member not found in this workspace.');

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    res.status(200).json({ status: 'success', message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// 13. GET WORKSPACE CALENDAR (cards grouped by dueDate for a given month)
export const getWorkspaceCalendar = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-12

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    // Month window: first day → last day
    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month, 0, 23, 59, 59, 999); // last ms of last day

    // Collect all board ids in this workspace
    const projectIds = (await Project.find({ workspaceId }).select('_id')).map(p => p._id);
    const boards = await Board.find({ projectId: { $in: projectIds } }).select('_id name projectId');
    const boardMap = Object.fromEntries(boards.map(b => [b._id.toString(), { name: b.name, projectId: b.projectId }]));
    const boardIds = boards.map(b => b._id);

    // Fetch cards with dueDate in range
    const cards = await Card.find({
      boardId: { $in: boardIds },
      dueDate: { $gte: rangeStart, $lte: rangeEnd },
    })
      .populate('assignees', 'name email avatarUrl')
      .sort({ dueDate: 1 });

    // Group cards by YYYY-MM-DD key
    const grouped = {};
    for (const card of cards) {
      const d = card.dueDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        _id: card._id,
        name: card.name,
        column: card.column,
        labels: card.labels,
        dueDate: card.dueDate,
        assignees: card.assignees,
        boardId: card.boardId,
        boardName: boardMap[card.boardId.toString()]?.name || '',
        projectId: boardMap[card.boardId.toString()]?.projectId || null,
      });
    }

    res.status(200).json({
      status: 'success',
      year,
      month,
      calendarData: grouped,
    });
  } catch (error) {
    next(error);
  }
};

// 14. GET WORKSPACE ANALYTICS
export const getWorkspaceAnalytics = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    // All projects in workspace
    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map(p => p._id);

    // All boards in workspace
    const boards = await Board.find({ projectId: { $in: projectIds } }).select('_id name projectId');
    const boardIds = boards.map(b => b._id);
    const boardMap = Object.fromEntries(boards.map(b => [b._id.toString(), b]));

    // All cards
    const allCards = await Card.find({ boardId: { $in: boardIds } })
      .populate('assignees', 'name email avatarUrl')
      .lean();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const DONE_PATTERN = /done|completed|finished|closed/i;

    // ── 1. Cards by column/status ──────────────────────────
    const byColumn = {};
    for (const card of allCards) {
      const col = card.column || 'Unknown';
      byColumn[col] = (byColumn[col] || 0) + 1;
    }
    const cardsByStatus = Object.entries(byColumn)
      .map(([column, count]) => ({ column, count }))
      .sort((a, b) => b.count - a.count);

    // ── 2. Top assignees (by card count) ──────────────────
    const assigneeCounts = {};
    const assigneeDetails = {};
    for (const card of allCards) {
      for (const user of card.assignees || []) {
        const uid = user._id.toString();
        assigneeCounts[uid] = (assigneeCounts[uid] || 0) + 1;
        assigneeDetails[uid] = user;
      }
    }
    const topAssignees = Object.entries(assigneeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([uid, count]) => ({ user: assigneeDetails[uid], count }));

    // ── 3. Overdue cards ───────────────────────────────────
    const overdueCards = allCards.filter(
      c => c.dueDate && new Date(c.dueDate) < now && !DONE_PATTERN.test(c.column || '')
    );

    // ── 4. Completed this week ─────────────────────────────
    const completedThisWeek = allCards.filter(
      c => DONE_PATTERN.test(c.column || '') && new Date(c.updatedAt) >= weekAgo
    ).length;

    // ── 5. Per-project breakdown ───────────────────────────
    const projectBreakdown = projects.map(project => {
      const projectBoards = boards.filter(b => b.projectId.toString() === project._id.toString());
      const projectBoardIds = new Set(projectBoards.map(b => b._id.toString()));
      const projectCards = allCards.filter(c => projectBoardIds.has(c.boardId.toString()));
      const doneCards = projectCards.filter(c => DONE_PATTERN.test(c.column || ''));
      const overdueCount = projectCards.filter(
        c => c.dueDate && new Date(c.dueDate) < now && !DONE_PATTERN.test(c.column || '')
      ).length;

      return {
        projectId: project._id,
        name: project.name,
        isArchived: project.isArchived,
        totalBoards: projectBoards.length,
        totalCards: projectCards.length,
        doneCards: doneCards.length,
        overdueCards: overdueCount,
        completionPct: projectCards.length > 0
          ? Math.round((doneCards.length / projectCards.length) * 100)
          : 0,
      };
    });

    // ── 6. Label frequency ─────────────────────────────────
    const labelCounts = {};
    for (const card of allCards) {
      for (const label of card.labels || []) {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      }
    }
    const labelFrequency = Object.entries(labelCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.status(200).json({
      status: 'success',
      analytics: {
        totalCards: allCards.length,
        doneCards: allCards.filter(c => DONE_PATTERN.test(c.column || '')).length,
        overdueCount: overdueCards.length,
        completedThisWeek,
        cardsByStatus,
        topAssignees,
        projectBreakdown,
        labelFrequency,
        memberCount: workspace.members.length,
        projectCount: projects.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 15. GET WORKSPACE ACTIVITIES
export const getWorkspaceActivities = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found.');

    const activities = await ActivityModel.find({ workspaceId })
      .populate('userId', 'name email avatarUrl')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: 'success',
      activities,
    });
  } catch (error) {
    next(error);
  }
};

