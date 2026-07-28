import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveConversation, selectContacts } from '../../features/chatSlice.js';
import { selectCurrentUser } from '../../features/authSlice.js';
import { selectActiveWorkspace } from '../../features/workspaceSlice.js';
import { postNewMessage } from '../../services/chatService.js';
import { socket } from '../../services/socketService.js';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import Button from '../common/Button.jsx';

const MessageInput = ({ replyToMessage, setReplyToMessage }) => {
  const activeConversation = useSelector(selectActiveConversation);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const contacts = useSelector(selectContacts);
  const currentUser = useSelector(selectCurrentUser);

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Quick reaction emojis list
  const quickEmojis = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '👏'];

  useEffect(() => {
    // Reset state on conversation change
    setText('');
    setSelectedFile(null);
    setShowEmojiPanel(false);
    setShowMentions(false);
    if (setReplyToMessage) {
      setReplyToMessage(null);
    }
  }, [activeConversation, setReplyToMessage]);

  // Debounced socket typing emits
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Mentions check: e.g. "@" triggers search list
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }

    if (socket && activeConversation) {
      socket.emit('typing', {
        conversationId: activeConversation.id,
        type: activeConversation.type,
        userName: currentUser?.name || 'User',
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', {
          conversationId: activeConversation.id,
          type: activeConversation.type,
        });
      }, 2000);
    }
  };

  const handleSelectMention = (userName) => {
    const words = text.split(' ');
    words[words.length - 1] = `@${userName} `;
    setText(words.join(' '));
    setShowMentions(false);
  };

  const handleEmojiClick = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPanel(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    // Emits stop typing
    if (socket && activeConversation) {
      socket.emit('stopTyping', {
        conversationId: activeConversation.id,
        type: activeConversation.type,
      });
    }

    try {
      if (selectedFile) {
        // Multi-part file upload using REST api
        const formData = new FormData();
        formData.append('content', text);
        formData.append('file', selectedFile);

        if (activeWorkspace?._id) {
          formData.append('workspaceId', activeWorkspace._id);
        }

        if (activeConversation.type === 'channel') {
          formData.append('channelId', activeConversation.id);
        } else {
          formData.append('receiverId', activeConversation.id);
        }

        if (replyToMessage) {
          formData.append('parentId', replyToMessage._id);
        }

        await postNewMessage(formData);
      } else {
        // Standard text message sent instantly via Socket
        if (socket) {
          if (activeConversation.type === 'channel') {
            socket.emit('sendMessage', { 
              channelId: activeConversation.id, 
              content: text,
              parentId: replyToMessage ? replyToMessage._id : undefined
            });
          } else {
            socket.emit('sendMessage', { 
              receiverId: activeConversation.id, 
              content: text,
              parentId: replyToMessage ? replyToMessage._id : undefined
            });
          }
        }
      }
      setText('');
      setSelectedFile(null);
      if (setReplyToMessage) {
        setReplyToMessage(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch message.');
    }
  };

  if (!activeConversation) return null;

  // Filter contacts matching mention query
  const eligibleMentions = contacts.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  return (
    <div className="p-3 border-t border-slate-900 bg-slate-950 relative">
      {replyToMessage && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 border-l-4 border-l-brand-purple flex items-center justify-between text-xs text-left relative">
          <div className="flex-1 min-w-0 pr-4">
            <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider block">
              Replying to {replyToMessage.senderId?.name || 'User'}
            </span>
            <p className="text-slate-350 truncate mt-0.5 text-[11px]">{replyToMessage.content}</p>
          </div>
          <button 
            type="button"
            onClick={() => setReplyToMessage(null)} 
            className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-850 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {/* File upload previews */}
      {selectedFile && (
        <div className="mb-2 p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-xs max-w-sm text-left">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip size={12} className="text-brand-purple flex-shrink-0" />
            <span className="text-slate-350 truncate">{selectedFile.name}</span>
            <span className="text-[10px] text-slate-500 flex-shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button 
            onClick={() => setSelectedFile(null)} 
            className="text-slate-500 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Mentions Dropdown autocomplete list */}
      {showMentions && eligibleMentions.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 z-10 glass-panel p-2 rounded-xl max-h-36 overflow-y-auto w-48 text-left border border-slate-800/80">
          <span className="text-[9px] uppercase font-bold text-slate-500 px-1.5 block mb-1">Mentions</span>
          <div className="flex flex-col gap-0.5">
            {eligibleMentions.map(c => (
              <button
                key={c._id}
                onClick={() => handleSelectMention(c.name)}
                className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-850 rounded hover:text-white text-left truncate w-full"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick emoji popover */}
      {showEmojiPanel && (
        <div className="absolute bottom-full left-4 mb-2 z-10 glass-panel p-2 rounded-xl border border-slate-800/80 flex gap-1.5 shadow-xl">
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="hover:scale-125 transition-transform text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 items-center">
        {/* Attachment upload input */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Share File"
        >
          <Paperclip size={16} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Emoji activator */}
        <button
          type="button"
          onClick={() => setShowEmojiPanel(!showEmojiPanel)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Reactions"
        >
          <Smile size={16} />
        </button>

        {/* Chat text input fields */}
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder={`Message ${activeConversation.type === 'channel' ? '#' + activeConversation.name : activeConversation.name}...`}
          className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-850 text-white placeholder-slate-550 focus:outline-none focus:border-brand-purple"
        />

        <Button type="submit" variant="accent" className="px-3.5 py-2">
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
