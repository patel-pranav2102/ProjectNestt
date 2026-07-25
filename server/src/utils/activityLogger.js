import ActivityModel from '../models/Activity.js';

/**
 * Log a workspace-level action activity.
 *
 * @param {string} workspaceId
 * @param {string|null} projectId
 * @param {string} userId
 * @param {string} action
 * @param {object} [details]
 */
export const logActivity = async (workspaceId, projectId, userId, action, details = {}) => {
  try {
    const activity = new ActivityModel({
      workspaceId,
      projectId: projectId || null,
      userId,
      action,
      details,
    });
    await activity.save();
  } catch (err) {
    console.error('[logActivity] failed to save log:', err.message);
  }
};
