import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resetPasswordRequest } from '../services/authService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    try {
      const data = await resetPasswordRequest(token, { password });
      setStatus('success');
      setMessage(data.message || 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000); // Redirect after 3s
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Password reset failed. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80svh] px-4">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl" />

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">Reset Password</h2>
          <p className="text-slate-400 text-sm mt-2">Enter your new account password below.</p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-4 flex flex-col gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
              ✓
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
            <p className="text-xs text-slate-500">Redirecting you to login page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {status === 'error' && (
              <span className="text-xs text-rose-500 font-medium">
                {message}
              </span>
            )}

            <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
