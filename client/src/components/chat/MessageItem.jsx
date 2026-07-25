import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../features/authSlice.js';
import { updateMessage, removeMessage } from '../../features/chatSlice.js';
import { 
  editMessageContent, 
  deleteMessageById, 
  togglePinStatus, 
  toggleReactionStatus 
} from '../../services/chatService.js';
import { Shield, Pin, Edit, Trash2, Smile, ArrowUpRight, MessageSquare, Download, CornerUpLeft } from 'lucide-react';
import Button from '../common/Button.jsx';

const MessageItem = ({ message, onReply }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showReactSelector, setShowReactSelector] = useState(false);

  const u = message.senderId;
  const isSelf = u?._id === currentUser?.id;
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    try {
      const data = await editMessageContent(message._id, editText);
      dispatch(updateMessage(data.message));
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update message.');
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!confirm('Delete this message permanently?')) return;
    try {
      await deleteMessageById(message._id);
      dispatch(removeMessage(message._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete message.');
    }
  };

  // Toggle Pin
  const handleTogglePin = async () => {
    try {
      await togglePinStatus(message._id);
      dispatch(updateMessage({ ...message, isPinned: !message.isPinned }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pin message.');
    }
  };

  // Reaction Click
  const handleReactionClick = async (emoji) => {
    try {
      const data = await toggleReactionStatus(message._id, emoji);
      dispatch(updateMessage({ ...message, reactions: data.reactions }));
      setShowReactSelector(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit reaction.');
    }
  };

  // Group reactions for visual display
  const reactionGroups = message.reactions?.reduce((acc, current) => {
    acc[current.emoji] = acc[current.emoji] || [];
    acc[current.emoji].push(current.userId);
    return acc;
  }, {});

  return (
    <div className={`group flex gap-3 p-3 hover:bg-slate-900/40 rounded-xl transition-colors relative text-left w-full
      ${message.isPinned ? 'bg-brand-purple/5 border-l-2 border-l-brand-purple' : ''}`}>
      
      {/* Sender Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center font-bold text-sm text-white">
        {u?.avatarUrl ? (
          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
        ) : (
          u?.name?.[0].toUpperCase() || 'U'
        )}
      </div>

      {/* Message Contents */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{u?.name || 'Unknown User'}</span>
          <span className="text-[10px] text-slate-500">{formattedTime}</span>
          
          {message.isPinned && (
            <span className="text-[9px] text-brand-purple font-semibold uppercase tracking-wider flex items-center gap-1">
              <Pin size={8} className="fill-brand-purple" /> Pinned
            </span>
          )}
        </div>

        {message.parentId && typeof message.parentId === 'object' && (
          <div className="mb-2 p-2.5 rounded-lg bg-slate-900/45 border border-slate-900 border-l-2 border-l-brand-purple text-xs text-left max-w-xl self-start">
            <span className="text-[9px] font-bold text-brand-purple uppercase tracking-wider block">
              {message.parentId.senderId?.name || 'User'}
            </span>
            <p className="text-slate-400 truncate mt-0.5 text-[11px]">
              {message.parentId.content || '[Attachment]'}
            </p>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex gap-2 items-center mt-1">
            <input
              type="text"
              className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              required
            />
            <Button type="submit" variant="accent" size="sm">Save</Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          </form>
        ) : (
          <p className="text-sm text-slate-300 break-words leading-relaxed whitespace-pre-wrap">
            {/* simple regex mention highlighting */}
            {(message.content || '').split(' ').map((word, idx) => {
              if (word.startsWith('@')) {
                return <span key={idx} className="text-brand-purple font-semibold">{word} </span>;
              }
              return word + ' ';
            })}
          </p>
        )}

        {/* Attachments rendering */}
        {message.attachments?.map((file, idx) => (
          <div key={idx} className="mt-2">
            {file.fileType === 'image' ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="block max-w-sm rounded-lg overflow-hidden border border-slate-800">
                <img src={file.url} alt={file.name} className="max-h-48 w-auto object-cover" />
              </a>
            ) : (
              <a 
                href={file.url} 
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 text-xs text-slate-300 max-w-xs transition-colors"
              >
                <div className="p-1.5 rounded bg-slate-950 text-slate-400">
                  <Download size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{file.fileType}</p>
                </div>
              </a>
            )}
          </div>
        ))}

        {/* Reactions List */}
        {reactionGroups && Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(reactionGroups).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(currentUser?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors flex items-center gap-1
                    ${hasReacted 
                      ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' 
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700'}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-bold">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Toolbar action panels on hover */}
      <div className="absolute right-4 top-2 hidden group-hover:flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-lg z-10 shadow-lg">
        {onReply && (
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 rounded hover:bg-slate-850 text-slate-400 hover:text-white"
            title="Reply"
          >
            <CornerUpLeft size={14} />
          </button>
        )}

        {/* Reaction quick selector trigger */}
        <div className="relative">
          <button 
            onClick={() => setShowReactSelector(!showReactSelector)}
            className="p-1.5 rounded hover:bg-slate-850 text-slate-400 hover:text-white"
            title="React"
          >
            <Smile size={14} />
          </button>
          {showReactSelector && (
            <div className="absolute bottom-full right-0 mb-1 z-20 flex gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 shadow-xl">
              {['👍', '❤️', '😂', '🎉'].map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => handleReactionClick(emoji)}
                  className="hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pin trigger */}
        <button 
          onClick={handleTogglePin}
          className="p-1.5 rounded hover:bg-slate-850 text-slate-400 hover:text-white"
          title="Pin message"
        >
          <Pin size={14} className={message.isPinned ? 'fill-brand-purple text-brand-purple' : ''} />
        </button>

        {/* Edit (Self only) */}
        {isSelf && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded hover:bg-slate-850 text-slate-400 hover:text-white"
            title="Edit"
          >
            <Edit size={14} />
          </button>
        )}

        {/* Delete (Self or Workspace Admin check) */}
        {(isSelf || currentUser?.role === 'Admin') && (
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-slate-850 text-slate-400 hover:text-rose-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

    </div>
  );
};

export default MessageItem;
