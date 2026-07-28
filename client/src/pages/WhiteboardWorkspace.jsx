import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectDrawings, 
  selectActiveDrawing, 
  setDrawings,
  setActiveDrawing,
  addDrawing,
  removeDrawing,
  updateDrawingState
} from '../features/whiteboardSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { 
  fetchProjectDrawings, 
  fetchDrawingDetails, 
  createNewDrawing, 
  updateDrawingDetails,
  deleteDrawingDetails 
} from '../services/whiteboardService.js';
import { fetchProjectDetails } from '../services/projectService.js';
import { socket } from '../services/socketService.js';
import { Excalidraw } from '@excalidraw/excalidraw';
import "@excalidraw/excalidraw/index.css";
import Button from '../components/common/Button.jsx';
import { ArrowLeft, Save, Plus, Trash2, Layout, Info, Users, ShieldAlert } from 'lucide-react';

const WhiteboardWorkspace = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const currentUser = useSelector(selectCurrentUser);
  const drawings = useSelector(selectDrawings);
  const activeDrawing = useSelector(selectActiveDrawing);

  const [sketchName, setSketchName] = useState('');
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);

  // Prevents echo loops on socket updates
  const isIncomingSocketUpdateRef = useRef(false);
  const elementsRef = useRef([]);

  // 1. Fetch Project Details (to determine permissions)
  const { data: projData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  const project = projData?.project;
  const projectMembers = projData?.members || [];
  const isProjAdmin = projectMembers.find(m => m.userId?._id === currentUser?.id)?.role === 'Admin';
  const isProjMember = projectMembers.some(m => m.userId?._id === currentUser?.id);

  // 2. Fetch Drawings in Project
  const { data: drawingsData, isLoading: isDrawingsLoading } = useQuery({
    queryKey: ['drawings', projectId],
    queryFn: () => fetchProjectDrawings(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (drawingsData?.drawings) {
      dispatch(setDrawings(drawingsData.drawings));
      if (drawingsData.drawings.length > 0 && !activeDrawing) {
        dispatch(setActiveDrawing(drawingsData.drawings[0]));
      }
    }
  }, [drawingsData, dispatch, activeDrawing]);

  // 3. Fetch specific drawing details
  const { data: detailsData } = useQuery({
    queryKey: ['drawing-details', activeDrawing?._id],
    queryFn: () => fetchDrawingDetails(activeDrawing._id),
    enabled: !!activeDrawing?._id,
  });

  useEffect(() => {
    if (detailsData?.drawing && excalidrawAPI) {
      isIncomingSocketUpdateRef.current = true;
      excalidrawAPI.updateScene({
        elements: detailsData.drawing.elements || [],
      });
      setTimeout(() => {
        isIncomingSocketUpdateRef.current = false;
      }, 200);
    }
  }, [detailsData, excalidrawAPI]);

  // 4. Whiteboard Sockets element updates and events
  useEffect(() => {
    if (socket && activeDrawing) {
      socket.emit('joinWhiteboard', { drawingId: activeDrawing._id });

      socket.on('whiteboardUpdate', ({ elements, appState, editorId }) => {
        if (editorId !== currentUser?.id && excalidrawAPI) {
          isIncomingSocketUpdateRef.current = true;
          excalidrawAPI.updateScene({ elements });
          setTimeout(() => {
            isIncomingSocketUpdateRef.current = false;
          }, 150);
        }
      });

      return () => {
        if (socket) {
          socket.emit('leaveWhiteboard', { drawingId: activeDrawing._id });
          socket.off('whiteboardUpdate');
        }
      };
    }
  }, [activeDrawing, currentUser, excalidrawAPI]);

  // Excalidraw Change trigger
  const handleCanvasChange = (elements, appState) => {
    elementsRef.current = elements;

    if (isIncomingSocketUpdateRef.current || !activeDrawing) return;

    // Broadcast edits via socket
    if (socket) {
      socket.emit('whiteboardEdit', {
        drawingId: activeDrawing._id,
        elements,
        appState,
      });
    }
  };

  // Create board
  const handleCreateDrawing = async (e) => {
    e.preventDefault();
    if (!sketchName.trim() || !projectId) return;

    setLoading(true);
    try {
      const data = await createNewDrawing({
        projectId,
        name: sketchName,
      });
      dispatch(addDrawing(data.drawing));
      dispatch(setActiveDrawing(data.drawing));
      setSketchName('');
    } catch (err) {
      alert('Failed to create whiteboard drawing.');
    } finally {
      setLoading(false);
    }
  };

  // Save drawing content manually
  const handleSaveWhiteboard = async () => {
    if (!activeDrawing) return;
    setLoading(true);
    try {
      const data = await updateDrawingDetails(activeDrawing._id, {
        elements: elementsRef.current,
      });
      dispatch(updateDrawingState(data.drawing));
      alert('Drawing elements saved to ProjectNest cloud successfully.');
    } catch (err) {
      alert('Failed to save drawing elements.');
    } finally {
      setLoading(false);
    }
  };

  // Delete drawing board
  const handleDeleteDrawing = async () => {
    if (!activeDrawing) return;
    if (!confirm('Are you sure you want to delete this whiteboard permanently?')) return;

    try {
      await deleteDrawingDetails(activeDrawing._id);
      dispatch(removeDrawing(activeDrawing._id));
      alert('Whiteboard deleted successfully.');
    } catch (err) {
      alert('Failed to delete whiteboard.');
    }
  };

  if (isDrawingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium font-display">Loading drawing boards...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-7xl w-full mx-auto relative h-[80svh] overflow-hidden">
      
      {/* Sidebar: boards selection directories */}
      <div className="w-full md:w-64 glass-panel rounded-2xl flex flex-col p-4 text-left shrink-0 h-full bg-slate-950/20">
        
        {/* Create form */}
        <div className="border-b border-slate-900 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Whiteboard Files</h3>
          {isProjMember && (
            <form onSubmit={handleCreateDrawing} className="flex gap-2">
              <input
                type="text"
                placeholder="New sketch name..."
                value={sketchName}
                onChange={(e) => setSketchName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-850 text-xs text-white placeholder-slate-600 focus:outline-none"
                required
              />
              <Button type="submit" variant="secondary" className="p-1 px-2.5 text-xs" isLoading={loading}>
                <Plus size={12} />
              </Button>
            </form>
          )}
        </div>

        {/* Directory Items */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin">
          {drawings.map(d => {
            const isActive = activeDrawing?._id === d._id;

            return (
              <button
                key={d._id}
                onClick={() => dispatch(setActiveDrawing(d))}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors w-full group
                  ${isActive 
                    ? 'bg-brand-purple/10 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-855 hover:text-slate-200'
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layout size={14} className={isActive ? 'text-brand-purple' : 'text-slate-500'} />
                  <span className="text-xs truncate">{d.name}</span>
                </div>
              </button>
            );
          })}

          {drawings.length === 0 && (
            <span className="text-xs text-slate-650 italic px-3 py-1">No whiteboards.</span>
          )}
        </div>

      </div>

      {/* Main Whiteboard Excalidraw Frame */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden h-full relative bg-slate-950/20">
        {activeDrawing ? (
          <>
            {/* Header controls toolbar */}
            <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between gap-4 flex-wrap z-10">
              <div className="flex items-center gap-2.5">
                <Layout size={16} className="text-brand-purple" />
                <h2 className="text-sm font-bold text-white">{activeDrawing.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="accent" onClick={handleSaveWhiteboard} isLoading={loading}>
                  <Save size={12} className="mr-1.5" />
                  <span>Save Sketch</span>
                </Button>
                {isProjAdmin && (
                  <Button size="sm" variant="outline" onClick={handleDeleteDrawing} className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10">
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>

            {/* Excalidraw wrapper */}
            <div className="flex-1 bg-slate-900 border-none relative text-left">
              <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={{
                  elements: activeDrawing.elements || [],
                  appState: { 
                    theme: 'dark',
                    viewBackgroundColor: '#0f172a',
                    gridSize: 20
                  }
                }}
                onChange={handleCanvasChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-550 p-8">
            <Layout size={36} className="text-slate-700" />
            <h3 className="text-lg font-bold text-slate-400 font-display">No Whiteboard Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm text-center leading-relaxed">
              Create a project sketch board or switch active files in the left sidebar directory to open drawings.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default WhiteboardWorkspace;
