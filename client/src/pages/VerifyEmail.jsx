import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyEmailToken } from '../services/authService.js';
import Button from '../components/common/Button.jsx';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  const calledRef = React.useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const confirmVerification = async () => {
      try {
        const data = await verifyEmailToken(token);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification token is invalid or has expired.');
      }
    };
    confirmVerification();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[80svh] px-4">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative text-center">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl" />

        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-white">Verifying Account</h3>
            <p className="text-sm text-slate-400">Please wait while we confirm your email token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Verified!</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
            <Button variant="accent" onClick={() => navigate('/login')} className="w-full mt-4">
              Sign In
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-3xl font-bold">
              ✕
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Verification Failed</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
            <Button variant="secondary" onClick={() => navigate('/register')} className="w-full mt-4">
              Register Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
