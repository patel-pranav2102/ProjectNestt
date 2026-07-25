import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { loginUser } from '../services/authService.js';
import { setCredentials, setLoading, setError, selectAuthError, selectAuthLoading } from '../features/authSlice.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const authError = useSelector(selectAuthError);
  const authLoading = useSelector(selectAuthLoading);
  
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (formData) => {
    dispatch(setLoading(true));
    try {
      const data = await loginUser(formData);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate(from, { replace: true });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(setError(errorMessage));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80svh] px-4">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl" />
        
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-sm mt-2">Log in to collaborate on ProjectNest</p>
        </div>

        {authError && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs text-left font-medium">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            required
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
            required
            error={errors.password}
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters long'
              }
            })}
          />

          <div className="flex items-center justify-between text-xs mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input type="checkbox" className="rounded bg-slate-900 border-slate-800 text-brand-purple focus:ring-brand-purple/20" />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="text-brand-purple hover:underline font-medium">Forgot password?</a>
          </div>

          <Button type="submit" variant="accent" isLoading={authLoading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <a href="/register" className="text-brand-cyan hover:underline font-medium">Create an account</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
