import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, ArrowRight,
  ClipboardList, CheckSquare, FileText, Palette, MessageSquare, Users, Filter, Video
} from 'lucide-react';
import {
  selectNotifications,
  selectUnreadCount,
  setNotifications,
  markRead,
  markAllRead,
  removeNotification,
} from '../features/notificationSlice.js';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
} from '../services/notificationService.js';

/* ── type metadata ────────────────────────────────────────── */
const TYPE_META = {
  task_assigned:    { icon: CheckSquare,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Task Assigned'     },
  card_comment:     { icon: MessageSquare, color: 'text-sky-400',     bg: 'bg-sky-500/10',     label: 'Card Comment'      },
  board_updated:    { icon: ClipboardList, color: 'text-brand-purple',bg: 'bg-brand-purple/10',label: 'Board Updated'     },
  doc_shared:       { icon: FileText,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Document Shared'   },
  channel_mention:  { icon: MessageSquare, color: 'text-brand-cyan',  bg: 'bg-brand-cyan/10',  label: 'Channel Mention'   },
  workspace_invite: { icon: Users,         color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Workspace Invite'  },
  meeting_invite:    { icon: Video,         color: 'text-brand-cyan',  bg: 'bg-brand-cyan/10',  label: 'Meeting Invite'    },
};

const FILTER_OPTIONS = [
  { value: 'all',    label: 'All'       },
  { value: 'unread', label: 'Unread'    },
  { value: 'task_assigned',    label: 'Tasks'     },
  { value: 'doc_shared',       label: 'Documents' },
  { value: 'channel_mention',  label: 'Mentions'  },
  { value: 'workspace_invite', label: 'Invites'   },
  { value: 'meeting_invite',    label: 'Meetings'  },
];

const relTime = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/* ── component ────────────────────────────────────────────── */
const ActivityFeed = () => {
  const dispatch      = useDispatch();
  const navigate      = useNavigate();
  const notifications = useSelector(selectNotifications);
  const unreadCount   = useSelector(selectUnreadCount);

  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /* Initial load */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications({ page: 1, limit: 20 });
        dispatch(setNotifications({ notifications: data.notifications, unreadCount: data.unreadCount }));
        setHasMore(data.pagination.page < data.pagination.pages);
        setPage(1);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [dispatch]);

  const loadMore = async () => {
    const next = page + 1;
    setLoading(true);
    try {
      const data = await fetchNotifications({ page: next, limit: 20 });
      dispatch(setNotifications({
        notifications: [...notifications, ...data.notifications],
        unreadCount: data.unreadCount
      }));
      setHasMore(next < data.pagination.pages);
      setPage(next);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    dispatch(markRead(id));
    try { await markNotificationRead(id); } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    dispatch(markAllRead());
    try { await markAllNotificationsRead(); } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    dispatch(removeNotification(id));
    try { await deleteNotificationById(id); } catch { /* silent */ }
  };

  const handleClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  /* Apply client-side filter */
  const filtered = notifications.filter(n => {
    if (filter === 'all')    return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  return (
    <div className="flex-1 flex flex-col gap-5 p-1 md:p-6 text-left h-[82svh] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Bell size={20} className="text-brand-purple" />
            Activity Feed
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-xs text-brand-cyan hover:bg-brand-purple/20 transition-colors"
          >
            <CheckCheck size={13} />
            Mark all as read
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-2 flex-wrap shrink-0">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === opt.value
                ? 'bg-brand-purple/10 border-brand-purple/30 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {opt.value === 'all' && <Filter size={11} />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Feed list ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-2 pr-1 pb-4">

        {loading && filtered.length === 0 && (
          <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-slate-900/60 border border-slate-900" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-700">
              <Bell size={36} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-400 font-display">No notifications</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
                {filter === 'unread' ? "You're all caught up!" : "No activity to show yet."}
              </p>
            </div>
          </div>
        )}

        {filtered.map(notif => {
          const meta = TYPE_META[notif.type] || {};
          const Icon = meta.icon || Bell;
          return (
            <div
              key={notif._id}
              className={`glass-panel rounded-xl border-slate-900/60 p-4 flex items-start gap-4 cursor-pointer group transition-colors hover:bg-slate-900/40 ${
                !notif.isRead ? 'border-l-2 border-l-brand-purple' : ''
              }`}
              onClick={() => handleClick(notif)}
            >
              {/* Icon badge */}
              <div className={`p-2 rounded-lg ${meta.bg || 'bg-slate-800'} shrink-0 mt-0.5`}>
                <Icon size={14} className={meta.color || 'text-slate-400'} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${notif.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-slate-600">{relTime(notif.createdAt)}</span>
                  {meta.label && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-brand-purple" />
                )}
                {notif.link && (
                  <ArrowRight
                    size={14}
                    className="text-slate-700 group-hover:text-white transition-colors"
                  />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(notif._id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all ml-1"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && !loading && filtered.length > 0 && (
          <button
            onClick={loadMore}
            className="mx-auto mt-2 px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            Load more
          </button>
        )}

        {loading && filtered.length > 0 && (
          <p className="text-center text-xs text-slate-600 py-2">Loading…</p>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
