import Meeting from '../models/Meeting.js';
import Workspace from '../models/Workspace.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { emitNotification } from '../sockets/chatSocket.js';

// 1. SCHEDULE MEETING
export const scheduleMeeting = async (req, res, next) => {
  try {
    const { workspaceId, title, description, startTime, endTime, link, attendees } = req.body;

    if (!workspaceId || !title || !startTime || !endTime) {
      throw new BadRequestError('Workspace ID, title, startTime, and endTime are required.');
    }

    if (new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestError('Start time must be before end time.');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const meeting = new Meeting({
      workspaceId,
      title,
      description,
      startTime,
      endTime,
      link,
      attendees: attendees || [],
    });

    await meeting.save();

    // Trigger invite notifications to attendees (excluding the organizer)
    const io = req.app.get('io');
    if (io && attendees && attendees.length > 0) {
      const formattedDate = new Date(startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = new Date(startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      for (const attendeeId of attendees) {
        // Skip notifying the admin creating the meeting
        if (attendeeId.toString() === req.user.id.toString()) continue;

        try {
          await emitNotification(io, {
            recipient: attendeeId,
            type: 'meeting_invite',
            message: `You have been invited to a new meeting: "${title}" on ${formattedDate} at ${formattedTime}.`,
            link: `/workspace/${workspaceId}/calendar`,
            workspaceId,
            triggeredBy: req.user.id,
          });
        } catch (err) {
          console.error(`Failed to send invite notification to user ${attendeeId}:`, err.message);
        }
      }
    }

    const populated = await Meeting.findById(meeting._id)
      .populate('attendees', 'name email avatarUrl');

    res.status(201).json({
      status: 'success',
      meeting: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET WORKSPACE MEETINGS
export const getWorkspaceMeetings = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { year, month } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    let filter = { workspaceId };

    if (year && month) {
      const rangeStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const rangeEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.startTime = { $gte: rangeStart, $lte: rangeEnd };
    }

    const meetings = await Meeting.find(filter)
      .populate('attendees', 'name email avatarUrl')
      .sort({ startTime: 1 });

    res.status(200).json({
      status: 'success',
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

// 3. DELETE MEETING
export const deleteMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      throw new NotFoundError('Meeting not found.');
    }

    const workspace = await Workspace.findById(meeting.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const member = workspace.members.find(m => m.userId.toString() === req.user.id);
    const isOwner = workspace.owner.toString() === req.user.id;
    const isAdmin = member && member.role === 'Admin';
    const isTeamLeadOrAdminGlobal = req.user && (req.user.role === 'Team Lead' || req.user.role === 'Admin');

    if (!isOwner && !isAdmin && !isTeamLeadOrAdminGlobal) {
      throw new ForbiddenError('Administrative or Team Lead privileges are required to delete meetings.');
    }

    await Meeting.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Meeting deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
