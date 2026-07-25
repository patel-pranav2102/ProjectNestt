import React, { useState } from 'react';
import { forgotPasswordRequest } from '../services/authService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      const data = await forgotPasswordRequest({ email });
      setStatus('success');
      setMessage(data.message || 'Recovery email sent successfully!');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to request recovery link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80svh] px-4">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl" />

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">Forgot Password</h2>
          <p className="text-slate-400 text-sm mt-2">Enter your email address to receive a recovery link.</p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-4 flex flex-col gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
              ✓
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
            <a href="/login" className="text-xs text-brand-purple hover:underline font-semibold mt-2">Back to Login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {status === 'error' && (
              <span className="text-xs text-rose-500 font-medium">
                {message}
              </span>
            )}

            <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
              Send Link
            </Button>
            
            <div className="text-center">
              <a href="/login" className="text-xs text-slate-400 hover:text-white font-medium">Cancel and return</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
