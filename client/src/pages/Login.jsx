import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { loginUser } from '../services/authService.js';
import { setCredentials, setLoading, setError, selectAuthError, selectAuthLoading, selectIsAuthenticated } from '../features/authSlice.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authError = useSelector(selectAuthError);
  const authLoading = useSelector(selectAuthLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Redirect to /dashboard if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  const onSubmit = async (formData) => {
    dispatch(setLoading(true));
    try {
      const data = await loginUser(formData);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      window.location.href = '/dashboard';
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(setError(errorMessage));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[78svh] px-4 py-8">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden border border-slate-800/80 bg-slate-950/60">
        
        {/* Minimalist Top Logo Badge */}
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-purple to-indigo-600 flex items-center justify-center font-display font-black text-white text-lg shadow-lg shadow-purple-500/20">
            P
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">Welcome to ProjectNest</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">Log in to your developer collaboration portal</p>
        </div>

        {authError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

          <div className="flex items-center justify-between text-xs mt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
              <input type="checkbox" className="rounded bg-slate-950 border-slate-800 text-brand-purple focus:ring-1 focus:ring-brand-purple/30" />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="text-brand-purple hover:text-purple-400 font-semibold transition-colors">Forgot password?</a>
          </div>

          <Button type="submit" variant="accent" isLoading={authLoading} className="w-full mt-2 py-2.5">
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          Don't have an account?{' '}
          <a href="/register" className="text-brand-cyan hover:text-cyan-300 font-bold transition-colors">Create an account</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
