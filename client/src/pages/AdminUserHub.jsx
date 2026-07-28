import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Search, UserPlus, Edit, Trash2, Shield, X, Check, Save, RefreshCw, AlertCircle 
} from 'lucide-react';
import { fetchSystemUsers, createSystemUser, updateSystemUser, deleteSystemUser } from '../services/adminService.js';
import { socket } from '../services/socketService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const AdminUserHub = () => {
  const qClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Developer');
  const [status, setStatus] = useState('offline');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('success');

  // Fetch all users
  const { data, isLoading, error } = useQuery({
    queryKey: ['system-users'],
    queryFn: fetchSystemUsers,
  });

  const users = data?.users || [];

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: createSystemUser,
    onSuccess: () => {
      qClient.invalidateQueries(['system-users']);
      setModalOpen(false);
      resetForm();
      alert('User created successfully!');
    },
    onError: (err) => {
      setStatusType('error');
      setStatusMsg(err.response?.data?.message || 'Failed to create user.');
    }
  });

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSystemUser(id, payload),
    onSuccess: () => {
      qClient.invalidateQueries(['system-users']);
      setModalOpen(false);
      resetForm();
      alert('User updated successfully!');
    },
    onError: (err) => {
      setStatusType('error');
      setStatusMsg(err.response?.data?.message || 'Failed to update user.');
    }
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: deleteSystemUser,
    onSuccess: () => {
      qClient.invalidateQueries(['system-users']);
      alert('User deleted successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Developer');
    setStatus('offline');
    setSelectedUser(null);
    setStatusMsg('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen('create');
  };

  const handleOpenEdit = (user) => {
    resetForm();
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status || 'offline');
    setModalOpen('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMsg('');

    if (modalOpen === 'create') {
      createUserMutation.mutate({ name, email, password, role, status });
    } else if (modalOpen === 'edit' && selectedUser) {
      const payload = { name, email, role, status };
      if (password.trim() !== '') {
        payload.password = password;
      }
      updateUserMutation.mutate({ id: selectedUser._id, payload });
    }
  };

  // Real-time status changes listener
  useEffect(() => {
    if (socket) {
      const handleStatusChanged = ({ userId, status }) => {
        qClient.setQueryData(['system-users'], (oldData) => {
          if (!oldData?.users) return oldData;
          return {
            ...oldData,
            users: oldData.users.map(u => u._id === userId ? { ...u, status } : u)
          };
        });
      };

      socket.on('statusChanged', handleStatusChanged);
      return () => {
        if (socket) {
          socket.off('statusChanged', handleStatusChanged);
        }
      };
    }
  }, [qClient]);

  const handleDelete = (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}'s account? This action is permanent.`)) {
      deleteUserMutation.mutate(id);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Statistics calculations
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'Admin').length;
  const leadCount = users.filter(u => u.role === 'Team Lead').length;
  const devCount = users.filter(u => u.role === 'Developer').length;

  return (
    <div className="flex-1 flex flex-col gap-5 p-1 md:p-6 text-left h-[82svh] overflow-hidden">
      
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Shield size={20} className="text-brand-purple" />
            Global User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, update, and manage global user accounts, assignments, and authorization roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-purple placeholder-slate-600"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple/80 transition-colors"
          >
            <UserPlus size={14} />
            Create User
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="glass-panel p-4 rounded-2xl border-slate-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple shrink-0">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Users</p>
            <h3 className="text-base font-bold text-white mt-0.5">{totalCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-slate-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admins</p>
            <h3 className="text-base font-bold text-white mt-0.5">{adminCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-slate-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan shrink-0">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Team Leads</p>
            <h3 className="text-base font-bold text-white mt-0.5">{leadCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-slate-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 shrink-0 text-emerald-400">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Developers</p>
            <h3 className="text-base font-bold text-white mt-0.5">{devCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid table view */}
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
              <h4 className="text-xs font-bold text-slate-400">Failed to load users</h4>
              <p className="text-[11px] text-slate-600 mt-0.5">Error parsing server data</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-700">
              <Users size={36} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400">No users found</h4>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                {search ? 'Try adjusting your search criteria.' : 'Create a user to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/40 text-slate-500 border-b border-slate-900 sticky top-0 backdrop-blur-md">
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Joined Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="truncate max-w-[150px]">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        user.role === 'Admin' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : user.role === 'Team Lead'
                            ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
                            : 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 flex items-center gap-1.5 capitalize">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'online' ? 'bg-emerald-400' : user.status === 'away' ? 'bg-amber-400' : 'bg-slate-600'
                        }`} />
                        {user.status || 'offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit User"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id, user.name)}
                          disabled={deleteUserMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-555 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-slate-500"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
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

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border-slate-900 p-6 flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-850 transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-white font-display">
                {modalOpen === 'create' ? 'Create New User Account' : 'Edit User Settings'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {modalOpen === 'create' 
                  ? 'Add a developer, team lead, or administrative account to the system.' 
                  : 'Modify global configurations and account metadata.'}
              </p>
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-lg text-xs font-semibold border ${
                statusType === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {statusMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              <Input
                label="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Alice Smith"
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="e.g. alice@test.com"
              />

              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider text-slate-300">
                  Password {modalOpen === 'edit' && <span className="text-[10px] text-slate-500 font-normal italic">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required={modalOpen === 'create'}
                  placeholder={modalOpen === 'create' ? 'Min 8 characters' : 'Enter new password'}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-purple/60 placeholder-slate-700 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">System Role (Global)</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-brand-purple/60 cursor-pointer transition-colors"
                >
                  <option value="Developer">Developer</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">User Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-brand-purple/60 cursor-pointer transition-colors"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                </select>
              </div>

              <div className="flex gap-2.5 justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  isLoading={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {modalOpen === 'create' ? 'Create User' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserHub;
