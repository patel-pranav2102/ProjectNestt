import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { registerUser } from '../services/authService.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [message, setMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (formData) => {
    setLoading(true);
    setStatus('idle');
    try {
      const data = await registerUser(formData);
      setStatus('success');
      setMessage(data.message || 'Registration successful! Verification link sent to your email.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Registration failed. Please check your inputs.');
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

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-sm mt-2">Get started with ProjectNest developer portal</p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-4 flex flex-col gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-bold text-white">Check Your Email</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
            <Button variant="secondary" onClick={() => navigate('/login')} className="w-full mt-4">
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {status === 'error' && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs text-left font-medium">
                {message}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              error={errors.name}
              {...register('name', { 
                required: 'Name is required',
                maxLength: {
                  value: 50,
                  message: 'Name cannot exceed 50 characters'
                }
              })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              error={errors.email}
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                  message: 'Please enter a valid email address'
                }
              })}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password}
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters long'
                }
              })}
            />

            <Button type="submit" variant="accent" isLoading={loading} className="w-full mt-2">
              Create Account
            </Button>
          </form>
        )}

        {status !== 'success' && (
          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <a href="/login" className="text-brand-purple hover:underline font-medium">Sign in instead</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
