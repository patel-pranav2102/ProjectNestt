import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { searchWorkspace } from '../services/workspaceService.js';
import {
  Search, ClipboardList, CheckSquare, FileText,
  Palette, MessageSquare, ArrowRight, X, Loader2
} from 'lucide-react';

/* ─── tiny helpers ──────────────────────────────────────────── */
const TYPES = [
  { value: '',          label: 'All Types' },
  { value: 'project',  label: 'Projects'  },
  { value: 'card',     label: 'Tasks'     },
  { value: 'document', label: 'Documents' },
  { value: 'drawing',  label: 'Whiteboards' },
  { value: 'channel',  label: 'Channels'  },
];

const SECTION_META = {
  projects:  { icon: ClipboardList, color: 'text-brand-purple',  label: 'Projects'     },
  cards:     { icon: CheckSquare,   color: 'text-emerald-400',   label: 'Tasks / Cards' },
  documents: { icon: FileText,      color: 'text-sky-400',       label: 'Documents'    },
  drawings:  { icon: Palette,       color: 'text-brand-cyan',    label: 'Whiteboards'  },
  channels:  { icon: MessageSquare, color: 'text-amber-400',     label: 'Channels'     },
};

const EMPTY = { projects: [], documents: [], drawings: [], cards: [], channels: [] };

/* ─── component ─────────────────────────────────────────────── */
const SearchHub = () => {
  const { workspaceId } = useParams();
  const activeWorkspace = useSelector(selectActiveWorkspace);

  const [q,         setQ]         = useState('');
  const [type,      setType]      = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const [results,  setResults]  = useState(EMPTY);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceRef = useRef(null);

  /* ── search executor ── */
  const runSearch = useCallback(async (params) => {
    const id = workspaceId || activeWorkspace?._id;
    if (!id) return;
    setLoading(true);
    try {
      const data = await searchWorkspace(id, params);
      setResults(data.results || EMPTY);
    } catch {
      setResults(EMPTY);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [workspaceId, activeWorkspace]);

  /* ── debounced auto-search on q change ── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch({ q, type, startDate, endDate });
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [q, type, startDate, endDate, runSearch]);

  const handleClear = () => {
    setQ('');
    setType('');
    setStartDate('');
    setEndDate('');
    setResults(EMPTY);
    setSearched(false);
  };

  const hasResults = Object.values(results).some(arr => arr.length > 0);
  const wId = workspaceId || activeWorkspace?._id;

  /* ── link builders ── */
  const linkFor = (entity, item) => {
    switch (entity) {
      case 'projects':  return `/workspace/${item._id}`;
      case 'cards':     return `/workspace/${wId}/project/${item.projectId}/board`;
      case 'documents': return `/workspace/${wId}/project/${item.projectId}/docs`;
      case 'drawings':  return `/workspace/${wId}/project/${item.projectId}/whiteboard`;
      case 'channels':  return `/workspace/${wId}/chat`;
      default:          return '#';
    }
  };

  const titleFor = (entity, item) => {
    switch (entity) {
      case 'channels': return `# ${item.name}`;
      case 'cards':    return item.name;
      default:         return item.title || item.name || '—';
    }
  };

  const subtitleFor = (entity, item) => {
    switch (entity) {
      case 'projects':  return item.description || item.owner?.name || '';
      case 'documents':
      case 'drawings':  return `By ${item.creator?.name || 'Unknown'}`;
      case 'cards': {
        const names = (item.assignees || []).map(u => u.name).join(', ');
        return names ? `Assigned: ${names}` : item.status || '';
      }
      default: return '';
    }
  };

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col gap-5 p-1 md:p-6 text-left h-[82svh] overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
          <Search size={20} className="text-brand-purple" />
          Global Search
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Search across projects, tasks, documents, whiteboards and channels in this workspace.
        </p>
      </div>

      {/* ── Search Bar + Filters ── */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 shrink-0 border-slate-900/60 bg-slate-950/20">

        {/* Search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          {loading && (
            <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-purple animate-spin" />
          )}
          <input
            id="search-hub-input"
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type to search tasks, docs, whiteboards, channels…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-purple/60 transition-colors"
          />
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Type</label>
            <select
              id="search-type-filter"
              value={type}
              onChange={e => setType(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple/60"
            >
              {TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Created From */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Created From</label>
            <input
              id="search-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple/60"
            />
          </div>

          {/* Created To */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Created To</label>
            <input
              id="search-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple/60"
            />
          </div>

          {/* Clear */}
          <div className="flex flex-col justify-end">
            <button
              id="search-clear-btn"
              onClick={handleClear}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            >
              <X size={12} />
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Results Area ── */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-5 pb-4">

        {/* Loading skeleton pulse rows */}
        {loading && !hasResults && (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-slate-900/60 border border-slate-900" />
            ))}
          </div>
        )}

        {/* Categorised results */}
        {!loading && hasResults && Object.entries(results).map(([entity, items]) => {
          if (!items?.length) return null;
          const { icon: Icon, color, label } = SECTION_META[entity] || {};
          return (
            <div key={entity} className="flex flex-col gap-2">
              {/* Section header */}
              <div className="flex items-center gap-2 border-b border-slate-900 pb-1.5">
                {Icon && <Icon size={13} className={color} />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {label} <span className="text-slate-600 ml-1">({items.length})</span>
                </span>
              </div>

              {/* Cards grid */}
              <div className={`grid gap-3 ${entity === 'channels' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {items.map(item => (
                  <a
                    key={item._id}
                    href={linkFor(entity, item)}
                    className="glass-panel p-3.5 rounded-xl border-slate-900/60 bg-slate-950/10 flex items-center justify-between gap-3 group hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                        {titleFor(entity, item)}
                      </p>
                      {subtitleFor(entity, item) && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {subtitleFor(entity, item)}
                        </p>
                      )}
                      {/* Labels badge for cards */}
                      {entity === 'cards' && item.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.labels.slice(0, 4).map((lbl, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-brand-purple/10 border border-brand-purple/20 text-brand-purple"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-slate-700 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </a>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!loading && searched && !hasResults && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-600">
              <Search size={36} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-display">No results found</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
                Try a different keyword, or adjust the type and date filters above.
              </p>
            </div>
          </div>
        )}

        {/* Initial prompt */}
        {!loading && !searched && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="p-5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-700">
              <Search size={36} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-400 font-display">Start typing to search</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
                Results will appear automatically as you type. Use filters to narrow down by type or date.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchHub;
