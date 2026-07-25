import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { 
  selectDocuments, 
  selectActiveDocument, 
  setActiveDocument, 
  addDocument 
} from '../../features/documentSlice.js';
import { createNewDocument } from '../../services/documentService.js';
import { socket } from '../../services/socketService.js';
import { FileText, Plus, Search, ChevronRight } from 'lucide-react';

const DocumentSidebar = () => {
  const { projectId } = useParams();
  const dispatch = useDispatch();

  const documents = useSelector(selectDocuments);
  const activeDocument = useSelector(selectActiveDocument);

  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectDocument = (doc) => {
    if (socket && activeDocument) {
      socket.emit('leaveDocument', { documentId: activeDocument._id });
    }

    dispatch(setActiveDocument(doc));

    if (socket && doc) {
      socket.emit('joinDocument', { documentId: doc._id });
    }
  };

  const handleCreateNote = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const data = await createNewDocument({
        projectId,
        title: 'Untitled Note',
        content: '',
      });
      dispatch(addDocument(data.document));
      handleSelectDocument(data.document);
    } catch (err) {
      alert('Failed to initialize document note.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => doc.title.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <div className="w-full md:w-64 glass-panel rounded-2xl flex flex-col p-4 text-left shrink-0 h-[80svh] bg-slate-950/20">
      
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-4">
        <h3 className="text-lg font-bold text-white font-display">Notes Directory</h3>
        <button 
          onClick={handleCreateNote}
          disabled={loading}
          className="p-1 rounded text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
          title="Create New Note"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Directory Filter Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          placeholder="Filter notes..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-550 focus:outline-none"
        />
      </div>

      {/* List items */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin">
        {filteredDocs.map(doc => {
          const isActive = activeDocument?._id === doc._id;

          return (
            <button
              key={doc._id}
              onClick={() => handleSelectDocument(doc)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors w-full group
                ${isActive 
                  ? 'bg-brand-purple/10 text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-855 hover:text-slate-200'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className={isActive ? 'text-brand-purple' : 'text-slate-500'} />
                <span className="text-xs truncate">{doc.title}</span>
              </div>
              <ChevronRight size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}

        {filteredDocs.length === 0 && (
          <span className="text-xs text-slate-650 italic px-3 py-1">No document notes.</span>
        )}
      </div>

    </div>
  );
};

export default DocumentSidebar;
