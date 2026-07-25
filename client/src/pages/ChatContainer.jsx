import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  selectActiveConversation, 
  selectChatMessages, 
  selectTypingUsers, 
  setMessages,
  addMessage,
  updateMessage
} from '../features/chatSlice.js';
import { selectCurrentUser, selectToken } from '../features/authSlice.js';
import { setContacts } from '../features/chatSlice.js';
import { selectActiveWorkspace } from '../features/workspaceSlice.js';
import { fetchWorkspaceDetails } from '../services/workspaceService.js';
import { 
  fetchChannelMessages, 
  fetchDMMessages,
  postNewMessage, 
  fetchChannelDetails 
} from '../services/chatService.js';
import { initSocket, disconnectSocket, socket } from '../services/socketService.js';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import MessageItem from '../components/chat/MessageItem.jsx';
import MessageInput from '../components/chat/MessageInput.jsx';
import Button from '../components/common/Button.jsx';
import { Hash, Lock, Search, Pin, MessageSquare, X, Send, AlertCircle } from 'lucide-react';

const ChatContainer = () => {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const activeConversation = useSelector(selectActiveConversation);
  const messages = useSelector(selectChatMessages);
  const typingUsers = useSelector(selectTypingUsers);

  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Quote reply state
  const [replyToMessage, setReplyToMessage] = useState(null);

  const messagesEndRef = useRef(null);

  // 1. Fetch parent workspace details to populate contacts lists
  const { data: wsData } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (wsData?.workspace?.members) {
      // Map members as contacts list (excluding current user)
      const list = wsData.workspace.members
        .map(m => m.userId)
        .filter(u => u && u._id !== currentUser?.id);
      dispatch(setContacts(list));
    }
  }, [wsData, currentUser, dispatch]);

  // 2. Initialize socket connection on mount
  useEffect(() => {
    if (token) {
      const s = initSocket(token, dispatch);
      
      // Additional status changed listener
      s.on('statusChanged', ({ userId, status }) => {
        // Refresh workspace members to update online states
        queryClient.invalidateQueries(['workspace', workspaceId]);
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [token, workspaceId, dispatch, queryClient]);

  // 3. Fetch message log for active conversation
  const { data: msgData, isLoading: isMsgLoading } = useQuery({
    queryKey: ['messages', activeConversation?.id, searchQuery],
    queryFn: () => {
      if (activeConversation.type === 'channel') {
        return fetchChannelMessages(activeConversation.id, searchQuery);
      } else {
        return fetchDMMessages(activeConversation.id, searchQuery);
      }
    },
    enabled: !!activeConversation,
  });

  useEffect(() => {
    if (msgData?.messages) {
      dispatch(setMessages(msgData.messages));
    }
  }, [msgData, dispatch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trigger seen receipt when viewing messages
  useEffect(() => {
    if (socket && activeConversation && messages.length > 0) {
      const unseen = messages.filter(m => !m.readBy?.includes(currentUser?.id));
      unseen.forEach(m => {
        socket.emit('messageSeen', {
          messageId: m._id,
          conversationId: activeConversation.id,
          type: activeConversation.type
        });
      });
    }
  }, [messages, activeConversation, currentUser]);



  const filteredMessages = showPinnedOnly 
    ? messages.filter(m => m.isPinned)
    : messages;

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-7xl w-full mx-auto">
      
      {/* Sidebar Chat Directory */}
      <ChatSidebar />

      {/* Main Chat Interface Viewport */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden h-[80svh] relative bg-slate-950/20">
        
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {activeConversation.type === 'channel' ? (
                  <Hash size={18} className="text-brand-purple" />
                ) : (
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                    {activeConversation.avatarUrl ? (
                      <img src={activeConversation.avatarUrl} alt={activeConversation.name} className="w-full h-full object-cover" />
                    ) : (
                      activeConversation.name[0].toUpperCase()
                    )}
                  </div>
                )}
                <h2 className="text-base font-bold text-white font-display truncate max-w-[180px]">{activeConversation.name}</h2>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-3">
                {/* Message Search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded bg-slate-900 border border-slate-850 text-xs text-white focus:outline-none focus:border-brand-purple w-32 md:w-44 placeholder-slate-550"
                  />
                </div>

                {/* Filter Pin button */}
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={`p-1.5 rounded hover:bg-slate-900 transition-colors flex items-center gap-1.5 text-xs font-semibold
                    ${showPinnedOnly ? 'text-brand-purple bg-brand-purple/10 border border-brand-purple/20' : 'text-slate-400'}`}
                  title="Toggle Pinned Messages"
                >
                  <Pin size={12} className={showPinnedOnly ? 'fill-brand-purple' : ''} />
                  <span className="hidden md:inline">Pins</span>
                </button>
              </div>
            </div>

            {/* Message log viewport */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
              {isMsgLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-500 font-medium">Fetching history...</span>
                </div>
              ) : (
                <>
                  {filteredMessages.map((msg) => (
                    <MessageItem 
                      key={msg._id} 
                      message={msg} 
                      onReply={(parent) => setReplyToMessage(parent)}
                    />
                  ))}

                  {filteredMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
                      <AlertCircle size={20} className="text-slate-650" />
                      <span className="text-xs italic">No messages found matching search criteria.</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Real-time typing indicators */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1 text-[10px] text-brand-purple italic bg-slate-950/40 text-left">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Message Input Panel */}
            <MessageInput replyToMessage={replyToMessage} setReplyToMessage={setReplyToMessage} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 p-8">
            <MessageSquare size={36} className="text-slate-700" />
            <h3 className="text-lg font-bold text-slate-400 font-display">No Conversation Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm text-center leading-relaxed">
              Choose a public workspace channel or search developer directory lists in the sidebar to start real-time messaging coordinates.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatContainer;
