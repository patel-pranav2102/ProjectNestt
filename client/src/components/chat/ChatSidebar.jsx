import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectChannels, 
  selectContacts, 
  selectActiveConversation, 
  setActiveConversation, 
  addChannel,
  selectUnreadCounts
} from '../../features/chatSlice.js';
import { selectActiveWorkspace } from '../../features/workspaceSlice.js';
import { selectCurrentUser } from '../../features/authSlice.js';
import { createNewChannel } from '../../services/chatService.js';
import { socket } from '../../services/socketService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { Plus, Hash, Lock, Search, Users, X } from 'lucide-react';

const ChatSidebar = () => {
  const dispatch = useDispatch();
  
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const channels = useSelector(selectChannels);
  const contacts = useSelector(selectContacts);
  const activeConversation = useSelector(selectActiveConversation);
  const unreadCounts = useSelector(selectUnreadCounts);
  const currentUser = useSelector(selectCurrentUser);

  const [showModal, setShowModal] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  const isWorkspaceAdmin = activeWorkspace?.owner === currentUser?.id || 
    activeWorkspace?.members?.find(m => m.userId === currentUser?.id)?.role === 'Admin';

  const handleSelectConv = (conv) => {
    // Notify socket of room updates
    if (socket && activeConversation) {
      socket.emit('leaveConversation', { 
        conversationId: activeConversation.id, 
        type: activeConversation.type 
      });
    }

    dispatch(setActiveConversation(conv));

    if (socket && conv) {
      socket.emit('joinConversation', { 
        conversationId: conv.id, 
        type: conv.type 
      });
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChanName.trim() || !activeWorkspace) return;

    setLoading(true);
    setError('');
    try {
      const data = await createNewChannel({
        workspaceId: activeWorkspace._id,
        name: newChanName,
        description: newChanDesc,
        isPrivate,
      });
      dispatch(addChannel(data.channel));
      setNewChanName('');
      setNewChanDesc('');
      setIsPrivate(false);
      setShowModal(false);
      handleSelectConv({
        id: data.channel._id,
        type: 'channel',
        name: data.channel.name,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create channel.');
    } finally {
      setLoading(false);
    }
  };

  // Filter channels and contacts matching query
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(filterQuery.toLowerCase()));
  const filteredContacts = contacts.filter(u => u.name.toLowerCase().includes(filterQuery.toLowerCase()) && u._id !== currentUser?.id);

  return (
    <div className="w-full md:w-64 glass-panel rounded-2xl flex flex-col p-4 text-left shrink-0 h-[80svh]">
      <div className="flex items-center justify-between px-2 mb-4">
        <h3 className="text-lg font-bold text-white font-display">Chat Directory</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="p-1 rounded text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
          title="Create Channel"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Directory Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          placeholder="Filter chat rooms..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-550 focus:outline-none focus:border-brand-purple"
        />
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 block mb-1.5">Channels</span>
          <div className="flex flex-col gap-0.5">
            {filteredChannels.map(chan => {
              const isActive = activeConversation?.id === chan._id;
              const count = unreadCounts[chan._id] || 0;

              return (
                <button
                  key={chan._id}
                  onClick={() => handleSelectConv({ id: chan._id, type: 'channel', name: chan.name })}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors w-full
                    ${isActive ? 'bg-brand-purple/10 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {chan.isPrivate ? (
                      <Lock size={12} className={isActive ? 'text-brand-purple' : 'text-slate-500'} />
                    ) : (
                      <Hash size={13} className={isActive ? 'text-brand-purple' : 'text-slate-500'} />
                    )}
                    <span className="text-xs font-medium truncate">{chan.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-brand-purple text-[9px] font-bold text-white leading-none scale-90">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredChannels.length === 0 && (
              <span className="text-[10px] text-slate-650 italic px-2">No channels.</span>
            )}
          </div>
        </div>

        {/* Direct Messages List */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 block mb-1.5">Direct Messages</span>
          <div className="flex flex-col gap-0.5">
            {filteredContacts.map(contact => {
              const isActive = activeConversation?.id === contact._id;
              const count = unreadCounts[contact._id] || 0;

              return (
                <button
                  key={contact._id}
                  onClick={() => handleSelectConv({ id: contact._id, type: 'dm', name: contact.name, avatarUrl: contact.avatarUrl })}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors w-full
                    ${isActive ? 'bg-brand-purple/10 text-white' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
                        {contact.avatarUrl ? (
                          <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          contact.name[0].toUpperCase()
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                        contact.status === 'online' ? 'bg-emerald-400' : contact.status === 'away' ? 'bg-amber-400' : 'bg-slate-600'
                      }`} />
                    </div>
                    <span className="text-xs font-medium truncate">{contact.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-brand-purple text-[9px] font-bold text-white leading-none scale-90">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredContacts.length === 0 && (
              <span className="text-[10px] text-slate-650 italic px-2">No users in workspace.</span>
            )}
          </div>
        </div>
      </div>

      {/* Create Channel Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-xl font-bold font-display text-white mb-4">Create Channel</h3>
            
            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateChannel} className="flex flex-col gap-4">
              <Input
                label="Channel Name"
                placeholder="e.g. general-chat"
                value={newChanName}
                onChange={(e) => setNewChanName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple h-20 resize-none"
                  placeholder="e.g. Workspace discussion logs..."
                  value={newChanDesc}
                  onChange={(e) => setNewChanDesc(e.target.value)}
                />
              </div>

              {/* Private Channel Toggle Switcher */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Private Channel</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Limit access to selected workspace members.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-purple focus:ring-brand-purple"
                />
              </div>

              <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
                Create Channel
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
