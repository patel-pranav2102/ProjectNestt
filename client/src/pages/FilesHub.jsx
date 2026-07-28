import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Image, Video, File, Search, Download, AlertCircle, Upload, X, CheckCircle, Loader, Eye, ExternalLink
} from 'lucide-react';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { fetchWorkspaceFiles, uploadFileToWorkspace } from '../services/fileService.js';
import { downloadFileWithOriginalName } from '../utils/downloadUtils.js';

// Helper to ensure clean URL without invalid transformation flags
const getCleanFileUrl = (url) => {
  if (!url) return '';
  return url.replace('/raw/upload/fl_inline/', '/raw/upload/').replace('/image/upload/fl_inline/', '/image/upload/');
};

// Dedicated PDF Viewer component using Blob fetching + Native Object Embed
const PdfViewer = ({ file }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const cleanUrl = React.useMemo(() => getCleanFileUrl(file?.url), [file?.url]);

  useEffect(() => {
    let isMounted = true;
    let createdUrl = null;

    setLoading(true);

    fetch(cleanUrl)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then(blob => {
        if (!isMounted) return;
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(createdUrl);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Direct blob fetch failed, using clean URL fallback:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [cleanUrl]);

  const activeViewerUrl = blobUrl || cleanUrl;

  const handleOpenNewWindow = () => {
    window.open(activeViewerUrl, '_blank');
  };

  return (
    <div className="w-full h-[72vh] relative flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader size={24} className="animate-spin text-brand-purple" />
          <span className="text-xs text-slate-400 font-medium font-display">Opening PDF Document...</span>
        </div>
      ) : (
        <object
          data={activeViewerUrl}
          type="application/pdf"
          className="w-full h-full rounded-xl bg-slate-900"
        >
          {/* Fallback iframe using Google Docs viewer */}
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`}
            title={file.name}
            className="w-full h-full border-none bg-white rounded-xl"
          />
        </object>
      )}

      {/* Control Banner */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 shadow-2xl z-20">
        <span className="text-xs text-slate-200 font-medium truncate max-w-xs">{file.name}</span>
        <button
          onClick={handleOpenNewWindow}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-purple hover:bg-brand-purple/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <ExternalLink size={12} />
          <span>Open PDF in New Window</span>
        </button>
      </div>
    </div>
  );
};

// File type -> icon + color
const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'image':
      return <Image className="text-emerald-400" size={16} />;
    case 'video':
      return <Video className="text-brand-cyan" size={16} />;
    case 'pdf':
      return <FileText className="text-rose-400" size={16} />;
    case 'spreadsheet':
      return <FileText className="text-green-400" size={16} />;
    case 'presentation':
      return <FileText className="text-amber-400" size={16} />;
    case 'document':
      return <FileText className="text-brand-purple" size={16} />;
    default:
      return <File className="text-slate-400" size={16} />;
  }
};

const FILE_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  pdf: 'PDF',
  spreadsheet: 'Sheet',
  presentation: 'Slides',
  document: 'Doc',
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
  const queryClient = useQueryClient();
  const wId = workspaceId || activeWorkspace?._id;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace-files', wId],
    queryFn: () => fetchWorkspaceFiles(wId),
    enabled: !!wId,
  });

  const files = data?.files || [];

  const filtered = files.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || f.fileType === filterType;
    return matchSearch && matchType;
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !wId) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      await uploadFileToWorkspace(file, wId);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);
      queryClient.invalidateQueries(['workspace-files', wId]);
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const FILE_TYPES = ['all', 'image', 'video', 'pdf', 'document', 'spreadsheet', 'presentation'];

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
            Browse, upload, preview, and download all workspace files and attachments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-52">
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple placeholder-slate-600"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white border border-brand-purple/30 bg-brand-purple/10 hover:bg-brand-purple/20 hover:border-brand-purple/50 transition-all disabled:opacity-50"
          >
            {uploading
              ? <Loader size={14} className="animate-spin" />
              : <Upload size={14} />
            }
            <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="*/*"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Upload feedback banners */}
      {uploadSuccess && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shrink-0">
          <CheckCircle size={14} />
          <span>{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess('')} className="ml-auto"><X size={12} /></button>
        </div>
      )}
      {uploadError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium shrink-0">
          <AlertCircle size={14} />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError('')} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
        {FILE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all border
              ${filterType === type
                ? 'bg-brand-purple/15 border-brand-purple/30 text-brand-purple'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
          >
            {type === 'all' ? 'All Files' : (FILE_TYPE_LABELS[type] || type)}
            {type === 'all' && (
              <span className="ml-1.5 text-[9px] font-bold text-slate-600">{files.length}</span>
            )}
          </button>
        ))}
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
              <p className="text-[11px] text-slate-600 mt-0.5">Error communicating with server</p>
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
                {search || filterType !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : 'Upload a file or share attachments in channels — they\'ll appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/40 text-slate-500 border-b border-slate-900 sticky top-0 backdrop-blur-md">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Project</th>
                  <th className="px-6 py-3 font-semibold">Size</th>
                  <th className="px-6 py-3 font-semibold">Uploaded By</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filtered.map(file => (
                  <tr key={file._id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="flex items-center gap-2.5 min-w-0 text-left hover:text-brand-purple transition-colors cursor-pointer group/name"
                      >
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 group-hover/name:border-brand-purple/40">
                          {getFileIcon(file.fileType)}
                        </div>
                        <span className="truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                        {FILE_TYPE_LABELS[file.fileType] || file.fileType || 'File'}
                      </span>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Preview File"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => window.open(getCleanFileUrl(file.url), '_blank')}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Open in new tab"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => downloadFileWithOriginalName(file.url, file.name, file.fileType)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={`Download ${file.name}`}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden text-left shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  {getFileIcon(previewFile.fileType)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{previewFile.name}</h3>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    <span className="uppercase font-semibold">{previewFile.fileType}</span>
                    <span>•</span>
                    <span>{formatSize(previewFile.size)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFileWithOriginalName(previewFile.url, previewFile.name, previewFile.fileType)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-purple hover:bg-brand-purple/80 transition-colors cursor-pointer shadow-sm"
                >
                  <Download size={13} />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => window.open(getCleanFileUrl(previewFile.url), '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Open External</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 bg-slate-900/40 p-4 flex items-center justify-center overflow-auto">
              {previewFile.fileType === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg border border-slate-800"
                />
              ) : previewFile.fileType === 'video' ? (
                <video
                  src={previewFile.url}
                  controls
                  className="max-h-[70vh] max-w-full rounded-lg border border-slate-800"
                />
              ) : (
                <PdfViewer file={previewFile} />
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FilesHub;
