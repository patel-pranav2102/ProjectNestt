import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Calendar, X,
  CheckSquare, Users, Tag, Clock, ArrowRight, LayoutGrid, Rows3,
  Video, CalendarPlus, Trash2, Link
} from 'lucide-react';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { fetchWorkspaceCalendar } from '../services/calendarService.js';
import { fetchWorkspaceMeetings, createMeeting, deleteMeetingById } from '../services/meetingService.js';
import { fetchWorkspaceDetails } from '../services/workspaceService.js';

/* ─── constants ──────────────────────────────────────────── */
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ─── label colour mapper ────────────────────────────────── */
const LABEL_COLORS = [
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
];
const labelColor = (lbl) => LABEL_COLORS[Math.abs(lbl.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % LABEL_COLORS.length];

/* ─── helpers ────────────────────────────────────────────── */
const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

const today = new Date();
const todayKey = toKey(today);

const isOverdue = (dateKey) => dateKey < todayKey;

/* ─── Avatar strip ───────────────────────────────────────── */
const AvatarStrip = ({ users = [], max = 3 }) => (
  <div className="flex -space-x-1.5 overflow-hidden">
    {users.slice(0, max).map(u => (
      <div key={u._id || u} className="w-4 h-4 rounded-full bg-slate-700 border border-slate-950 overflow-hidden flex items-center justify-center text-[8px] font-bold text-white shrink-0" title={u.name || 'Member'}>
        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.[0] || 'M').toUpperCase()}
      </div>
    ))}
    {users.length > max && (
      <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-950 flex items-center justify-center text-[7px] text-slate-400">+{users.length - max}</div>
    )}
  </div>
);

/* ─── Card Event Tile ────────────────────────────────────── */
const CardTile = ({ card, dateKey, onClick }) => {
  const overdue = isOverdue(dateKey) && card.column?.toLowerCase() !== 'done';
  return (
    <button
      onClick={() => onClick({ type: 'card', data: card })}
      className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate transition-colors cursor-pointer
        ${overdue
          ? 'bg-rose-900/30 border border-rose-700/40 text-rose-300 hover:bg-rose-900/50'
          : 'bg-brand-purple/10 border border-brand-purple/20 text-slate-300 hover:bg-brand-purple/20'
        }`}
    >
      <span className="truncate block">📋 {card.name}</span>
    </button>
  );
};

/* ─── Meeting Event Tile ─────────────────────────────────── */
const MeetingTile = ({ meeting, onClick }) => {
  const timeStr = new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div
      onClick={() => onClick({ type: 'meeting', data: meeting })}
      className="w-full text-left px-1.5 py-1.5 rounded text-[10px] font-semibold transition-colors cursor-pointer bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/20 flex flex-col gap-1 overflow-hidden"
    >
      <div className="flex items-center gap-1 font-bold">
        <Video size={10} className="shrink-0 text-brand-cyan" />
        <span className="text-slate-400">{timeStr}</span>
      </div>
      <div className="truncate text-white text-[10px] w-full font-medium">{meeting.title}</div>
      {meeting.link && (
        <a
          href={meeting.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/35 text-[9px] hover:bg-brand-cyan/35 hover:text-white transition-all self-start max-w-full font-bold"
        >
          <Link size={8} className="shrink-0" />
          Join Meet
        </a>
      )}
    </div>
  );
};

/* ─── Detail Drawer ──────────────────────────────────────── */
const EventDrawer = ({ event, workspaceId, onClose, onDeleteMeeting, isAdmin }) => {
  if (!event) return null;
  const isMeeting = event.type === 'meeting';
  const item = event.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full glass-panel border-l border-slate-800 flex flex-col overflow-y-auto"
        style={{ animation: 'slideInRight 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-900">
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-1">
              {isMeeting ? 'Workspace Meeting' : item.boardName}
            </p>
            <h3 className="text-sm font-bold text-white leading-snug">{item.title || item.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Status/Times */}
          <div className="flex flex-col gap-2">
            {isMeeting ? (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock size={14} className="text-slate-500 shrink-0" />
                  <span>Start: {new Date(item.startTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock size={14} className="text-slate-500 shrink-0" />
                  <span>End: {new Date(item.endTime).toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <CheckSquare size={14} className="text-slate-500 shrink-0" />
                <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {item.column}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div className="flex flex-col gap-1.5 text-left border-t border-slate-900 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-900/60">{item.description}</p>
            </div>
          )}

          {/* Link */}
          {isMeeting && item.link && (
            <div className="flex items-center gap-2.5 text-xs">
              <Link size={14} className="text-slate-500 shrink-0" />
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline truncate">
                {item.link}
              </a>
            </div>
          )}

          {/* Attendees / Assignees */}
          {((isMeeting ? item.attendees : item.assignees) || []).length > 0 && (
            <div className="flex flex-col gap-2 text-left border-t border-slate-900 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isMeeting ? 'Attendees' : 'Assignees'}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {((isMeeting ? item.attendees : item.assignees) || []).map(u => (
                  <div key={u._id || u} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">
                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.[0] || 'M').toUpperCase()}
                    </div>
                    <span className="text-[10px] text-slate-300">{u.name || 'Member'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isMeeting ? (
            <a
              href={`/workspace/${workspaceId}/project/${item.projectId}/board`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-xs font-semibold text-brand-cyan hover:bg-brand-purple/20 transition-colors mt-2"
            >
              <ArrowRight size={13} />
              Open in Kanban Board
            </a>
          ) : (
            isAdmin && (
              <button
                onClick={() => onDeleteMeeting(item._id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors mt-2 w-full"
              >
                <Trash2 size={13} />
                Cancel / Delete Meeting
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────── */
const CalendarView = () => {
  const { workspaceId } = useParams();
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const currentUser     = useSelector(selectCurrentUser);
  const wId = workspaceId || activeWorkspace?._id;
  const qClient = useQueryClient();

  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(null); // event drawer
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form State
  const [mtTitle, setMtTitle] = useState('');
  const [mtDesc, setMtDesc] = useState('');
  const [mtStart, setMtStart] = useState('');
  const [mtEnd, setMtEnd] = useState('');
  const [mtLink, setMtLink] = useState('');
  const [mtAttendees, setMtAttendees] = useState([]);

  // Fetch Calendar Cards
  const { data: calData, isLoading: isCalLoading } = useQuery({
    queryKey: ['workspace-calendar', wId, year, month],
    queryFn: () => fetchWorkspaceCalendar(wId, year, month),
    enabled: !!wId,
  });

  // Fetch Calendar Meetings
  const { data: mtData, isLoading: isMtLoading } = useQuery({
    queryKey: ['workspace-meetings', wId, year, month],
    queryFn: () => fetchWorkspaceMeetings(wId, year, month),
    enabled: !!wId,
  });

  // Fetch Workspace Members list for attendees picker
  const { data: wsDetails } = useQuery({
    queryKey: ['workspace-details', wId],
    queryFn: () => fetchWorkspaceDetails(wId),
    enabled: !!wId,
  });

  const cardsGrouped = calData?.calendarData || {};
  const meetingsList = mtData?.meetings || [];
  const membersList  = wsDetails?.workspace?.members || [];

  // Determine administrative permissions for scheduling/deleting meetings
  const currentUserId = currentUser?.id || currentUser?._id;
  const workspace = wsDetails?.workspace;
  const isOwner = workspace?.owner?._id === currentUserId || workspace?.owner === currentUserId;
  const myMember = workspace?.members?.find(m => (m.userId?._id || m.userId)?.toString() === currentUserId);
  const isAdmin = isOwner || myMember?.role === 'Admin';

  // Group meetings by day
  const meetingsGrouped = meetingsList.reduce((acc, current) => {
    const d = new Date(current.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    acc[key] = acc[key] || [];
    acc[key].push(current);
    return acc;
  }, {});

  /* ── mutations ── */
  const scheduleMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      qClient.invalidateQueries(['workspace-meetings', wId]);
      setShowScheduleModal(false);
      // Reset form
      setMtTitle('');
      setMtDesc('');
      setMtStart('');
      setMtEnd('');
      setMtLink('');
      setMtAttendees([]);
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: deleteMeetingById,
    onSuccess: () => {
      qClient.invalidateQueries(['workspace-meetings', wId]);
      setSelected(null);
    },
  });

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!mtTitle || !mtStart || !mtEnd) return;
    scheduleMeetingMutation.mutate({
      workspaceId: wId,
      title: mtTitle,
      description: mtDesc,
      startTime: mtStart,
      endTime: mtEnd,
      link: mtLink,
      attendees: mtAttendees,
    });
  };

  const handleAttendeeToggle = (userId) => {
    setMtAttendees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const buildMonthGrid = useCallback(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const buildWeekDays = useCallback(() => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const monthGrid = buildMonthGrid();
  const weekDays  = buildWeekDays();

  const totalEvents = Object.values(cardsGrouped).reduce((s, arr) => s + arr.length, 0) + meetingsList.length;

  return (
    <div className="flex-1 flex flex-col gap-4 p-1 md:p-6 text-left h-[82svh] overflow-hidden">
      
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-brand-purple" />
            Workspace Calendar & Sprint Planner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalEvents} upcoming schedule items / meetings for this month range.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple/80 transition-colors"
            >
              <CalendarPlus size={14} />
              Schedule Meeting
            </button>
          )}

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-brand-purple/20 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={12} /> Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-brand-purple/20 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Rows3 size={12} /> Week
            </button>
          </div>

          {viewMode === 'month' ? (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-white min-w-[110px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-white min-w-[140px] text-center">
                {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading bar */}
      {(isCalLoading || isMtLoading) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" />
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {!(isCalLoading || isMtLoading) && viewMode === 'month' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 mb-1 shrink-0">
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 gap-px overflow-y-auto">
            {monthGrid.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="bg-slate-950/20 rounded-lg min-h-[80px]" />;

              const key = toKey(date);
              const cards = cardsGrouped[key] || [];
              const meetings = meetingsGrouped[key] || [];
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={`rounded-lg p-1.5 flex flex-col gap-1 min-h-[90px] border transition-colors ${
                    isToday ? 'border-brand-purple/40 bg-brand-purple/5' : 'border-slate-900/40 bg-slate-950/10 hover:bg-slate-900/20'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1 ${isToday ? 'text-brand-purple' : 'text-slate-600'}`}>
                    {date.getDate()}
                  </span>

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[75px] scrollbar-thin">
                    {meetings.map(m => (
                      <MeetingTile key={m._id} meeting={m} onClick={setSelected} />
                    ))}
                    {cards.map(card => (
                      <CardTile key={card._id} card={card} dateKey={key} onClick={setSelected} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {!(isCalLoading || isMtLoading) && viewMode === 'week' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 gap-2 shrink-0 mb-2">
            {weekDays.map(date => {
              const key = toKey(date);
              const isToday = key === todayKey;
              return (
                <div key={key} className={`text-center py-2 rounded-xl border ${isToday ? 'border-brand-purple/40 bg-brand-purple/5' : 'border-slate-900/40 bg-slate-950/10'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{DAY_NAMES_SHORT[date.getDay()]}</p>
                  <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-brand-purple' : 'text-slate-300'}`}>{date.getDate()}</p>
                </div>
              );
            })}
          </div>

          <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto">
            {weekDays.map(date => {
              const key = toKey(date);
              const cards = cardsGrouped[key] || [];
              const meetings = meetingsGrouped[key] || [];

              return (
                <div key={key} className="flex flex-col gap-2 min-h-[120px] max-h-[350px] overflow-y-auto scrollbar-thin pr-1">
                  {meetings.map(m => (
                    <MeetingTile key={m._id} meeting={m} onClick={setSelected} />
                  ))}
                  {cards.map(card => (
                    <CardTile key={card._id} card={card} dateKey={key} onClick={setSelected} />
                  ))}
                  {cards.length === 0 && meetings.length === 0 && (
                    <div className="flex-1 rounded-xl border border-dashed border-slate-900/40 opacity-30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel border border-slate-800 rounded-2xl overflow-hidden flex flex-col text-left">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
              <h3 className="text-sm font-bold text-white font-display">Schedule Workspace Meeting</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={mtTitle}
                  onChange={e => setMtTitle(e.target.value)}
                  placeholder="Design Sync or Sprint Review"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={mtDesc}
                  onChange={e => setMtDesc(e.target.value)}
                  placeholder="Reviewing Figma frames and design updates..."
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={mtStart}
                    onChange={e => setMtStart(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={mtEnd}
                    onChange={e => setMtEnd(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video Conference URL</label>
                <input
                  type="url"
                  value={mtLink}
                  onChange={e => setMtLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Attendees Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invite Attendees</label>
                <div className="max-h-32 overflow-y-auto scrollbar-thin border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1.5 bg-slate-900/40">
                  {membersList.map(member => {
                    const u = member.userId;
                    const isChecked = mtAttendees.includes(u._id);
                    return (
                      <label key={u._id} className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAttendeeToggle(u._id)}
                          className="w-3.5 h-3.5 rounded border-slate-800 text-brand-purple bg-slate-950 focus:ring-0 focus:ring-offset-0"
                        />
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name?.[0].toUpperCase()}
                        </div>
                        <span className="text-[11px] text-slate-300">{u.name} ({u.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={scheduleMeetingMutation.isLoading}
                className="mt-2 w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/80 transition-colors text-white font-bold text-xs"
              >
                {scheduleMeetingMutation.isLoading ? 'Scheduling...' : 'Create Workspace Meeting'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Details details */}
      {selected && (
        <EventDrawer
          event={selected}
          workspaceId={wId}
          onClose={() => setSelected(null)}
          isAdmin={isAdmin}
          onDeleteMeeting={(id) => {
            if (confirm('Delete this meeting permanently?')) {
              deleteMeetingMutation.mutate(id);
            }
          }}
        />
      )}

    </div>
  );
};

export default CalendarView;
