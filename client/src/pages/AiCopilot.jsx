import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectAiConversations, 
  selectActiveAiConversation, 
  selectSelectedModel,
  setConversations,
  setActiveConversation,
  setSelectedModel,
  clearAiStore
} from '../features/aiSlice.js';
import { selectCurrentUser } from '../features/authSlice.js';
import { 
  askCopilotChat, 
  fetchAiHistoryList, 
  fetchAiHistoryDetails, 
  deleteAiHistoryLog 
} from '../services/aiService.js';
import { fetchProjectDetails } from '../services/projectService.js';
import MarkdownRenderer from '../components/document/MarkdownRenderer.jsx';
import Button from '../components/common/Button.jsx';
import { ArrowLeft, Send, Sparkles, Plus, Trash2, Brain, FileCode, CheckSquare, ShieldAlert } from 'lucide-react';

const AiCopilot = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const currentUser = useSelector(selectCurrentUser);
  const conversations = useSelector(selectAiConversations);
  const activeConversation = useSelector(selectActiveAiConversation);
  const selectedModel = useSelector(selectSelectedModel);

  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef(null);

  // 1. Fetch Project Details (for contextual banner)
  const { data: projData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });

  const project = projData?.project;

  // 2. Fetch AI Conversations History List
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['ai-history'],
    queryFn: fetchAiHistoryList,
  });

  useEffect(() => {
    if (historyData?.conversations) {
      dispatch(setConversations(historyData.conversations));
    }
  }, [historyData, dispatch]);

  // 3. Scroll ONLY inside the chat messages container (does not scroll window down!)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, loading]);

  // Select conversation history details
  const handleSelectConversation = async (id) => {
    setLoading(true);
    try {
      const data = await fetchAiHistoryDetails(id);
      dispatch(setActiveConversation(data.conversation));
    } catch (err) {
      alert('Failed to retrieve chat logs.');
    } finally {
      setLoading(false);
    }
  };

  // Launch a new conversation
  const handleInitializeNewChat = () => {
    dispatch(setActiveConversation(null));
    setPromptText('');
  };

  // Delete conversation log
  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this AI chat history permanently?')) return;
    
    try {
      await deleteAiHistoryLog(id);
      if (activeConversation?._id === id) {
        dispatch(setActiveConversation(null));
      }
      refetchHistory();
    } catch (err) {
      alert('Failed to delete history log.');
    }
  };

  // Send Prompt Chat
  const handleSendPrompt = async (e) => {
    if (e) e.preventDefault();
    if (!promptText.trim() || loading) return;

    const userMessageContent = promptText.trim();
    setPromptText('');
    setLoading(true);

    // Optimistic user bubble append locally
    const currentMessages = activeConversation?.messages ? [...activeConversation.messages] : [];
    const updatedMessagesLocally = [
      ...currentMessages,
      { role: 'user', content: userMessageContent }
    ];

    if (!activeConversation) {
      // Temporary state while request processes
      dispatch(setActiveConversation({ messages: updatedMessagesLocally }));
    } else {
      dispatch(setActiveConversation({
        ...activeConversation,
        messages: updatedMessagesLocally,
      }));
    }

    try {
      const data = await askCopilotChat({
        conversationId: activeConversation?._id || null,
        projectId: projectId || null,
        messages: updatedMessagesLocally,
        selectedModel,
      });

      dispatch(setActiveConversation(data.conversation));
      refetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'AI request timed out.');
      // Revert optimistic append
      dispatch(setActiveConversation(activeConversation));
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt triggers
  const handleQuickPromptClick = (text) => {
    setPromptText(text);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 max-w-7xl w-full mx-auto relative h-[82svh] overflow-hidden text-left">
      
      {/* Left Column: conversations log list (Full width on mobile when no chat active) */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-64 glass-panel rounded-2xl flex-col p-4 shrink-0 h-full bg-slate-950/30 border border-slate-800/80`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-slate-800/80">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
            <Brain size={14} className="text-brand-purple" />
            <span>AI Chats</span>
          </h3>
          <button 
            onClick={handleInitializeNewChat}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
            title="Start New Chat"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Directory Items */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-none">
          {conversations.map(c => {
            const isActive = activeConversation?._id === c._id;

            return (
              <div
                key={c._id}
                onClick={() => handleSelectConversation(c._id)}
                className={`cursor-pointer select-none flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all w-full group
                  ${isActive 
                    ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
              >
                <span className="text-xs truncate flex-1 pr-2">{c.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(c._id, e)}
                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <span className="text-xs text-slate-500 italic px-3 py-2 text-center">No AI chat history.</span>
          )}
        </div>

      </div>

      {/* Middle Column: Chat Timeline */}
      <div className={`flex-1 glass-panel rounded-2xl flex-col overflow-hidden h-full relative bg-slate-950/30 border border-slate-800/80 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header toolbar */}
        <div className="px-4 md:px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap z-10">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Back to List Button */}
            <button
              onClick={() => dispatch(setActiveConversation(null))}
              className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              title="Back to AI Chats List"
            >
              <ArrowLeft size={16} />
            </button>

            <Sparkles size={16} className="text-brand-purple animate-pulse shrink-0" />
            <h2 className="text-xs md:text-sm font-bold text-white font-display truncate max-w-[120px] sm:max-w-[180px]">AI Copilot</h2>
            {project && (
              <span className="px-2 py-0.5 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-[9px] text-brand-purple font-semibold truncate hidden xs:inline">
                {project.name}
              </span>
            )}
          </div>

          {/* Model selector dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => dispatch(setSelectedModel(e.target.value))}
            className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-purple/70"
          >
            <option value="Gemini Pro v2">Gemini Pro v2</option>
            <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
            <option value="GPT-4o Mini">GPT-4o Mini</option>
          </select>
        </div>

        {/* Messaging Logs area (Container scrollable without scrolling browser window) */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 scrollbar-none">
          {activeConversation?.messages?.map((msg, idx) => {
            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={idx}
                className={`flex gap-2.5 max-w-[90%] md:max-w-[85%]
                  ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {/* Avatar bubble */}
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-white
                  ${isUser ? 'bg-slate-800 border border-slate-700' : 'bg-brand-purple'}`}>
                  {isUser ? (
                    currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.[0].toUpperCase() || 'U'
                    )
                  ) : (
                    'AI'
                  )}
                </div>

                {/* Bubble message content */}
                <div className={`p-3.5 md:p-4 rounded-2xl border text-left text-xs md:text-sm leading-relaxed
                  ${isUser 
                    ? 'bg-slate-900/80 border-slate-800/80 rounded-tr-none text-slate-100' 
                    : 'glass-panel border-slate-800/80 rounded-tl-none bg-slate-950/40 text-slate-200'}`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer markdown={msg.content} />
                  )}
                </div>
              </div>
            );
          })}

          {(!activeConversation?.messages || activeConversation.messages.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="p-3.5 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                <Brain size={28} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Chat with your Project Copilot</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                  Ask AI to analyze code snippets, write tasks to Kanban boards, or summarize project documents.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex gap-2.5 self-start">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-purple flex items-center justify-center font-bold text-xs text-white shrink-0">
                AI
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-950/60 border border-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300 delay-100" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce duration-300 delay-200" />
              </div>
            </div>
          )}
        </div>

        {/* Form Input footer */}
        <form onSubmit={handleSendPrompt} className="p-3 md:p-4 border-t border-slate-800/80 bg-slate-950/80 flex gap-2">
          <input
            type="text"
            placeholder="Ask Copilot a question..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none placeholder-slate-600 focus:border-brand-purple/70"
          />
          <Button type="submit" variant="accent" className="px-3.5 py-2 rounded-xl" disabled={loading}>
            <Send size={14} />
          </Button>
        </form>

      </div>

      {/* Right Column: Prompt Assistant helper shortcuts (desktop view) */}
      <div className="hidden lg:flex w-64 flex-col gap-4 shrink-0">
        <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3.5 text-left border border-slate-800/80 bg-slate-950/30">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
            <Sparkles size={13} className="text-brand-cyan" />
            <span>AI Shortcuts</span>
          </h4>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => handleQuickPromptClick('Explain the architecture and folders layout of this project.')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1 text-slate-200">
                <FileCode size={13} className="text-brand-purple" />
                <span className="text-[11px] font-bold">Explain Code Layout</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Explain standard codebase structure & files.</p>
            </button>

            <button
              onClick={() => handleQuickPromptClick('Explain standard bugs or race conditions to avoid inside MERN apps.')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1 text-slate-200">
                <ShieldAlert size={13} className="text-rose-400" />
                <span className="text-[11px] font-bold">Find Staging Bugs</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Check security setups & memory race issues.</p>
            </button>

            <button
              onClick={() => handleQuickPromptClick('Recommend 3 Kanban task cards to create for authentication security sprint.')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1 text-slate-200">
                <CheckSquare size={13} className="text-emerald-400" />
                <span className="text-[11px] font-bold">Recommend Tasks</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Create clear sprint task lists for boards.</p>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AiCopilot;
