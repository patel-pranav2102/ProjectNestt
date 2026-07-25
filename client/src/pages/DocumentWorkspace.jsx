import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectDocuments, 
  selectActiveDocument, 
  setDocuments,
  setActiveDocument,
  updateDocumentState,
  removeDocument
} from '../features/documentSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { 
  fetchProjectDocuments, 
  fetchDocumentDetails, 
  saveNewVersionSnapshot, 
  restoreVersionSnapshot,
  deleteDocumentDetails,
  updateDocumentDetails 
} from '../services/documentService.js';
import { fetchProjectDetails } from '../services/projectService.js';
import { socket } from '../services/socketService.js';
import DocumentSidebar from '../components/document/DocumentSidebar.jsx';
import MarkdownRenderer from '../components/document/MarkdownRenderer.jsx';
import Button from '../components/common/Button.jsx';
import { ArrowLeft, Edit2, Eye, FileText, Save, Clock, Trash2, Download, AlertTriangle, Users, X } from 'lucide-react';

const DocumentWorkspace = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const currentUser = useSelector(selectCurrentUser);
  const documents = useSelector(selectDocuments);
  const activeDocument = useSelector(selectActiveDocument);

  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [activeMode, setActiveMode] = useState('split'); // 'edit' | 'split' | 'preview'
  
  // Versions panel state
  const [showVersions, setShowVersions] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  // 1. Fetch Project Details (to determine permissions)
  const { data: projData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  const project = projData?.project;
  const projectMembers = projData?.members || [];
  const isProjAdmin = projectMembers.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';

  // 2. Fetch project documents
  const { data: docsData, isLoading: isDocsLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => fetchProjectDocuments(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (docsData?.documents) {
      dispatch(setDocuments(docsData.documents));
      if (docsData.documents.length > 0 && !activeDocument) {
        dispatch(setActiveDocument(docsData.documents[0]));
      }
    }
  }, [docsData, dispatch, activeDocument]);

  // 3. Fetch detailed document metadata (populates version snapshot history list)
  const { data: docDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['document-details', activeDocument?._id],
    queryFn: () => fetchDocumentDetails(activeDocument._id),
    enabled: !!activeDocument?._id,
  });

  useEffect(() => {
    if (docDetails?.document) {
      setEditorTitle(docDetails.document.title);
      setEditorContent(docDetails.document.content || '');
      setVersionHistory(docDetails.document.versions || []);
    }
  }, [docDetails]);

  // 4. Collaborative editing socket receivers
  useEffect(() => {
    if (socket && activeDocument) {
      // Connect to document room
      socket.emit('joinDocument', { documentId: activeDocument._id });

      // Live edit listeners
      socket.on('documentUpdate', ({ title, content, editorId }) => {
        if (editorId !== currentUser?.id) {
          if (title !== undefined) setEditorTitle(title);
          if (content !== undefined) setEditorContent(content);
        }
      });

      socket.on('documentCollaboratorJoined', ({ userName }) => {
        setCollaborators(prev => [...new Set([...prev, userName])]);
      });

      socket.on('documentCollaboratorLeft', ({ userName }) => {
        setCollaborators(prev => prev.filter(c => c !== userName));
      });

      return () => {
        socket.emit('leaveDocument', { documentId: activeDocument._id });
        socket.off('documentUpdate');
        socket.off('documentCollaboratorJoined');
        socket.off('documentCollaboratorLeft');
      };
    }
  }, [activeDocument, currentUser]);

  // 5. Handle Local typing and title updates
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setEditorTitle(val);
    if (socket && activeDocument) {
      socket.emit('documentEdit', { documentId: activeDocument._id, title: val });
    }
  };

  const handleTitleBlur = async () => {
    if (!activeDocument || !editorTitle.trim()) return;
    try {
      const data = await updateDocumentDetails(activeDocument._id, { title: editorTitle });
      dispatch(updateDocumentState(data.document));
      queryClient.invalidateQueries(['documents', projectId]);
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setEditorContent(val);
    if (socket && activeDocument) {
      socket.emit('documentEdit', { documentId: activeDocument._id, content: val });
    }
  };

  const handleContentBlur = async () => {
    if (!activeDocument) return;
    try {
      const data = await updateDocumentDetails(activeDocument._id, { content: editorContent });
      dispatch(updateDocumentState(data.document));
    } catch (err) {
      console.error('Failed to auto-save content:', err);
    }
  };

  // Save version snapshot
  const handleSaveSnapshot = async () => {
    if (!activeDocument) return;
    try {
      const data = await saveNewVersionSnapshot(activeDocument._id, editorContent);
      dispatch(updateDocumentState(data.document));
      setVersionHistory(data.document.versions || []);
      alert('Document version snapshot saved successfully.');
    } catch (err) {
      alert('Failed to save snapshot.');
    }
  };

  // Restore snapshot
  const handleRestoreVersion = async (versionId) => {
    if (!activeDocument) return;
    if (!confirm('Are you sure you want to restore this document version? Current un-saved text changes will be overwritten.')) return;
    try {
      const data = await restoreVersionSnapshot(activeDocument._id, versionId);
      dispatch(updateDocumentState(data.document));
      setEditorContent(data.document.content || '');
      setVersionHistory(data.document.versions || []);
      alert('Document version restored successfully.');
    } catch (err) {
      alert('Failed to restore selected version.');
    }
  };

  // PDF Export Print View
  const handleExportPDF = () => {
    window.print();
  };

  // Delete Document
  const handleDeleteDocument = async () => {
    if (!activeDocument) return;
    if (!confirm('Are you sure you want to delete this document note? All history versions will be erased.')) return;

    try {
      await deleteDocumentDetails(activeDocument._id);
      dispatch(removeDocument(activeDocument._id));
      alert('Document deleted successfully.');
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  if (isDocsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-7xl w-full mx-auto relative print:p-0 print:m-0 print:bg-white print:text-black">
      
      {/* Sidebar - hidden during printing */}
      <div className="print:hidden">
        <DocumentSidebar />
      </div>

      {/* Main workspace */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden h-[80svh] relative bg-slate-950/20 print:border-none print:shadow-none print:bg-white print:w-full print:h-auto">
        
        {activeDocument ? (
          <>
            {/* Header controls - hidden during printing */}
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <FileText size={18} className="text-brand-purple shrink-0" />
                <input
                  type="text"
                  value={editorTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-brand-purple text-base font-bold text-white focus:outline-none w-full"
                />
              </div>

              {/* Toolbar Options */}
              <div className="flex items-center gap-2">
                
                {/* Editor Mode Toggles */}
                <div className="flex rounded-lg bg-slate-900 border border-slate-850 p-0.5 text-xs text-slate-400">
                  <button 
                    onClick={() => setActiveMode('edit')}
                    className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${activeMode === 'edit' ? 'bg-brand-purple text-white' : 'hover:text-white'}`}
                  >
                    <Edit2 size={12} />
                    <span className="hidden md:inline">Edit</span>
                  </button>
                  <button 
                    onClick={() => setActiveMode('split')}
                    className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${activeMode === 'split' ? 'bg-brand-purple text-white' : 'hover:text-white'}`}
                  >
                    <FileText size={12} />
                    <span className="hidden md:inline">Split</span>
                  </button>
                  <button 
                    onClick={() => setActiveMode('preview')}
                    className={`px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${activeMode === 'preview' ? 'bg-brand-purple text-white' : 'hover:text-white'}`}
                  >
                    <Eye size={12} />
                    <span className="hidden md:inline">Preview</span>
                  </button>
                </div>

                {/* Save snapshot */}
                <button
                  onClick={handleSaveSnapshot}
                  className="p-2 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Save History Snapshot"
                >
                  <Save size={14} />
                </button>

                {/* Export PDF */}
                <button
                  onClick={handleExportPDF}
                  className="p-2 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Export PDF"
                >
                  <Download size={14} />
                </button>

                {/* Versions toggle */}
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className={`p-2 rounded transition-colors flex items-center gap-1.5 text-xs font-semibold
                    ${showVersions ? 'bg-brand-purple/10 border border-brand-purple/20 text-brand-purple' : 'bg-slate-900 border border-slate-850 text-slate-400 hover:bg-slate-800'}`}
                  title="Show Version History"
                >
                  <Clock size={14} />
                </button>

                {/* Delete document (Admin only) */}
                {isProjAdmin && (
                  <button
                    onClick={handleDeleteDocument}
                    className="p-2 rounded bg-slate-900 border border-slate-850 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

              </div>
            </div>

            {/* Collaborative headers - hidden during printing */}
            {collaborators.length > 0 && (
              <div className="px-6 py-1.5 bg-slate-950/40 border-b border-slate-900 text-[10px] text-slate-500 flex items-center gap-1.5 print:hidden">
                <Users size={10} className="text-brand-cyan" />
                <span>Editing now: {collaborators.join(', ')}</span>
              </div>
            )}

            {/* Editor Canvas workspace */}
            <div className="flex-1 flex overflow-hidden bg-slate-950/10 print:bg-white print:text-black">
              
              {/* Markdown Editor Area - hidden in preview mode, and during printing */}
              {activeMode !== 'preview' && (
                <textarea
                  value={editorContent}
                  onChange={handleContentChange}
                  onBlur={handleContentBlur}
                  placeholder="# Write Markdown Title here&#10;&#10;Use standard markdown tags:&#10;* Lists item&#10;**Bold text**&#10;`code blocks`"
                  className="flex-1 p-6 text-sm bg-slate-950/30 border-r border-slate-900/60 focus:outline-none resize-none overflow-y-auto text-slate-300 leading-relaxed font-mono focus:bg-slate-950/40 print:hidden"
                />
              )}

              {/* Compiled Preview Area - hidden in edit mode */}
              {activeMode !== 'edit' && (
                <div className="flex-1 overflow-y-auto scrollbar-thin print:overflow-visible print:w-full print:text-black">
                  {/* Styled for print compatibility */}
                  <div className="print:text-black print:bg-white max-w-3xl mx-auto">
                    {/* Rendered print title */}
                    <h1 className="text-3xl font-bold font-display text-black hidden print:block border-b border-gray-300 pb-3 mb-6">{editorTitle}</h1>
                    
                    <MarkdownRenderer markdown={editorContent} />
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-550 p-8">
            <FileText size={36} className="text-slate-700" />
            <h3 className="text-lg font-bold text-slate-400 font-display">No Document Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm text-center leading-relaxed">
              Create a project document note or switch selector items in the sidebar folder list to initialize collaborative documents.
            </p>
          </div>
        )}

      </div>

      {/* Right Drawer Version History list - hidden during printing */}
      {showVersions && activeDocument && (
        <div className="w-full md:w-80 glass-panel rounded-2xl flex flex-col overflow-hidden h-[80svh] shrink-0 border border-slate-800 animate-in slide-in-from-right duration-200 print:hidden text-left bg-slate-950/60">
          <div className="px-4 py-3.5 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-brand-purple" /> Version Snapshots
            </span>
            <button 
              onClick={() => setShowVersions(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
            {versionHistory.map((ver, idx) => (
              <div 
                key={ver._id}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-850 flex flex-col gap-2 relative group text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white">Snapshot #{versionHistory.length - idx}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(ver.createdAt).toLocaleString()}</p>
                  </div>
                  <Button 
                    size="xs" 
                    variant="outline" 
                    onClick={() => handleRestoreVersion(ver._id)}
                    className="text-[9px] uppercase tracking-wider border-brand-purple/20 text-brand-purple hover:bg-brand-purple/10"
                  >
                    Restore
                  </Button>
                </div>
                
                {/* Author profile */}
                <div className="flex items-center gap-1.5 mt-1 border-t border-slate-900 pt-2">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                    {ver.author?.avatarUrl ? (
                      <img src={ver.author.avatarUrl} alt={ver.author.name} className="w-full h-full object-cover" />
                    ) : (
                      ver.author?.name?.[0].toUpperCase() || 'U'
                    )}
                  </div>
                  <span className="text-[9px] text-slate-450 truncate">Saved by: {ver.author?.name || 'Developer'}</span>
                </div>

                {/* Quick snapshot text preview */}
                <p className="text-[10px] text-slate-500 truncate italic mt-1 bg-slate-950 p-1.5 rounded">
                  {ver.content || '(Blank)'}
                </p>
              </div>
            ))}

            {versionHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
                <AlertTriangle size={18} className="text-slate-650" />
                <span className="text-xs italic">No snapshots logged.</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentWorkspace;
