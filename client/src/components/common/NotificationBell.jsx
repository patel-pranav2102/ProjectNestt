import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, ArrowRight,
  ClipboardList, CheckSquare, FileText, Palette, MessageSquare, Users, Video
} from 'lucide-react';
import {
  selectNotifications,
  selectUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
} from '../../features/notificationSlice.js';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
  acceptInvite,
  declineInvite,
} from '../../services/notificationService.js';

/* ── type → icon map ──────────────────────────────────────── */
const TYPE_ICON = {
  task_assigned:    <CheckSquare  size={13} className="text-emerald-400 shrink-0" />,
  card_comment:     <MessageSquare size={13} className="text-sky-400 shrink-0" />,
  board_updated:    <ClipboardList size={13} className="text-brand-purple shrink-0" />,
  doc_shared:       <FileText      size={13} className="text-amber-400 shrink-0" />,
  channel_mention:  <MessageSquare size={13} className="text-brand-cyan shrink-0" />,
  workspace_invite: <Users         size={13} className="text-rose-400 shrink-0" />,
  team_invite:      <Users         size={13} className="text-brand-purple shrink-0" />,
  meeting_invite:    <Video         size={13} className="text-brand-cyan shrink-0" />,
};

/* ── relative time helper ─────────────────────────────────── */
const relTime = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ── component ────────────────────────────────────────────── */
const NotificationBell = () => {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const notifications = useSelector(selectNotifications);
  const unreadCount   = useSelector(selectUnreadCount);

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    dispatch(markRead(id));
    try { await markNotificationRead(id); } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    dispatch(markAllRead());
    try { await markAllNotificationsRead(); } catch { /* silent */ }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    dispatch(removeNotification(id));
    try { await deleteNotificationById(id); } catch { /* silent */ }
  };

  const handleAcceptInvite = async (e, id, type) => {
    e.stopPropagation();
    try {
      await acceptInvite(id);
      dispatch(removeNotification(id));
      alert('Invitation accepted successfully.');
      if (type === 'workspace_invite') {
        window.location.href = '/dashboard';
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept invitation.');
    }
  };

  const handleDeclineInvite = async (e, id) => {
    e.stopPropagation();
    try {
      await declineInvite(id);
      dispatch(removeNotification(id));
      alert('Invitation declined successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline invitation.');
    }
  };

  const handleClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const preview = notifications.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-rose-500 border border-slate-950 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-2xl border border-slate-800/80 shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ animation: 'fadeSlideDown 0.15s ease' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white font-display">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[10px] text-brand-cyan hover:text-white transition-colors"
              >
                <CheckCheck size={11} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-slate-900">
            {preview.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs text-slate-600">No notifications yet</p>
              </div>
            ) : (
              preview.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-900/60 group ${!notif.isRead ? 'bg-brand-purple/5' : ''}`}
                >
                  {/* Type icon */}
                  <div className="mt-0.5">
                    {TYPE_ICON[notif.type] ?? <Bell size={13} className="text-slate-500 shrink-0" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] leading-snug ${notif.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                      {notif.message}
                    </p>
                    {(notif.type === 'workspace_invite' || notif.type === 'team_invite') && (
                      <div className="flex gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleAcceptInvite(e, notif._id, notif.type)}
                          className="px-2 py-0.5 rounded bg-brand-purple text-[9px] font-bold text-white hover:bg-brand-purple/80 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => handleDeclineInvite(e, notif._id)}
                          className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    <span className="text-[9px] text-slate-600 mt-0.5 block">{relTime(notif.createdAt)}</span>
                  </div>

                  {/* Unread dot + delete */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif._id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-800 text-center">
            <button
              onClick={() => { navigate('/notifications'); setOpen(false); }}
              className="text-[10px] text-brand-cyan hover:text-white transition-colors flex items-center gap-1 mx-auto"
            >
              View all notifications <ArrowRight size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
