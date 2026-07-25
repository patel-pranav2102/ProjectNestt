import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { selectCurrentUser, updateUserProfile as updateReduxProfile } from '../features/authSlice.js';
import { updateUserProfile, uploadUserAvatar } from '../services/authService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { Camera, Shield, Mail, User } from 'lucide-react';

const DEFAULT_USER = {
  name: 'Developer Account',
  email: 'developer@projectnest.com',
  role: 'Developer',
  avatarUrl: '',
};

const Profile = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser) || DEFAULT_USER;
  const isReadOnly = currentUser.role === 'Developer' || currentUser.role === 'Admin';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: currentUser.name,
      role: currentUser.role,
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      reset({
        name: currentUser.name,
        role: currentUser.role,
      });
    }
  }, [currentUser, reset]);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [message, setMessage] = useState('');

  // Handle Profile Text Updates (Name, Role)
  const onProfileSubmit = async (formData) => {
    setProfileLoading(true);
    setStatus('idle');
    try {
      const data = await updateUserProfile(formData);
      dispatch(updateReduxProfile(data.user));
      setStatus('success');
      setMessage('Profile settings saved successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to update profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Avatar Image Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error');
      setMessage('Image file size cannot exceed 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarLoading(true);
    setStatus('idle');
    try {
      const data = await uploadUserAvatar(formData);
      dispatch(updateReduxProfile({ avatarUrl: data.avatarUrl }));
      setStatus('success');
      setMessage('Avatar image uploaded successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to upload avatar image.');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl relative overflow-hidden text-left">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl" />

        <h2 className="text-3xl font-bold font-display text-white tracking-tight mb-8">User Profile Settings</h2>

        {status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
            status === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {message}
          </div>
        )}

        {/* Profile Avatar Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-800 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white text-3xl font-bold font-display">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              )}
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 bg-slate-900/80 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2 bg-brand-purple hover:bg-violet-600 rounded-full cursor-pointer text-white shadow-lg transition-transform duration-200 hover:scale-105">
              <Camera size={14} />
              <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" disabled={avatarLoading} />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-white flex items-center justify-center sm:justify-start gap-2">
              {currentUser.name}
              <span className="px-2 py-0.5 rounded bg-brand-purple/10 text-brand-purple text-xs font-semibold uppercase tracking-wider">{currentUser.role}</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">{currentUser.email}</p>
            <p className="text-xs text-slate-500 mt-2">Maximum file size: 5MB. Supports JPG, PNG, or GIF formats.</p>
          </div>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSubmit(onProfileSubmit)} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              disabled={isReadOnly}
              error={errors.name}
              {...register('name', { 
                required: 'Name is required',
                maxLength: {
                  value: 50,
                  message: 'Name cannot exceed 50 characters'
                }
              })}
            />

            <div className="flex flex-col gap-1 w-full text-left">
              <label htmlFor="role" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Workspace Role
              </label>
              <select
                id="role"
                name="role"
                disabled={isReadOnly}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-800 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple disabled:opacity-60 disabled:cursor-not-allowed"
                {...register('role')}
              >
                <option value="Developer">Developer</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full text-left opacity-60">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
            <div className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-950 border border-slate-900 text-slate-400 flex items-center gap-2 select-none">
              <Mail size={16} />
              <span>{currentUser.email}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">Contact support to modify registered account email.</span>
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-3 mt-4">
              <Button type="submit" variant="accent" isLoading={profileLoading} className="px-6">
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
