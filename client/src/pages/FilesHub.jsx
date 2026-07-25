import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Image, Video, File, Search, Download, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { fetchWorkspaceFiles } from '../services/fileService.js';

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'image':
      return <Image className="text-emerald-400" size={16} />;
    case 'video':
      return <Video className="text-brand-cyan" size={16} />;
    case 'document':
      return <FileText className="text-brand-purple" size={16} />;
    default:
      return <File className="text-slate-400" size={16} />;
  }
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FilesHub = () => {
  const { workspaceId } = useParams();
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const wId = workspaceId || activeWorkspace?._id;

  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace-files', wId],
    queryFn: () => fetchWorkspaceFiles(wId),
    enabled: !!wId,
  });

  const files = data?.files || [];

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-5 p-1 md:p-6 text-left h-[82svh] overflow-hidden">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-brand-purple" />
            Files Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse and download all attachments and assets uploaded across chat messages and channels.
          </p>
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple placeholder-slate-600"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
        </div>
      </div>

      {/* Main Grid/List Container */}
      <div className="flex-1 glass-panel rounded-2xl border-slate-900/60 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" />
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400">Failed to load files</h4>
              <p className="text-[11px] text-slate-600 mt-0.5">Error parsing server data</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-700">
              <File size={36} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400">No files found</h4>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                {search ? 'Try adjusting your search criteria.' : 'Files uploaded to chat channels will show up here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/40 text-slate-500 border-b border-slate-900 sticky top-0 backdrop-blur-md">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Project</th>
                  <th className="px-6 py-3 font-semibold">Size</th>
                  <th className="px-6 py-3 font-semibold">Uploaded By</th>
                  <th className="px-6 py-3 font-semibold">Upload Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filtered.map(file => (
                  <tr key={file._id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {getFileIcon(file.fileType)}
                        </div>
                        <span className="truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {file.projectId?.name || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                          {file.uploadedBy?.avatarUrl ? (
                            <img src={file.uploadedBy.avatarUrl} alt={file.uploadedBy.name} className="w-full h-full object-cover" />
                          ) : (
                            (file.uploadedBy?.name?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <span className="text-slate-300 font-medium truncate max-w-[120px]">{file.uploadedBy?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Download file"
                      >
                        <Download size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default FilesHub;
