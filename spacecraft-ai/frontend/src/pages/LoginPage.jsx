import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { login, registerAndLogin } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => (mode === 'login' ? 'Login to SpaceCraft AI' : 'Create New Account'),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === 'login'
        ? 'Use your username and password to continue.'
        : 'New user? Create account and login instantly.',
    [mode]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === 'register' && password !== confirmPassword) {
      toast.error('Passwords do not match. Please re-enter password.');
      return;
    }

    setIsSubmitting(true);
    const payload = { username, password };
    const result = mode === 'login' ? login(payload) : registerAndLogin(payload);

    if (!result.success) {
      toast.error(result.error || 'Authentication failed');
      setIsSubmitting(false);
      return;
    }

    toast.success(mode === 'login' ? 'Login successful' : 'Account created and logged in');
    navigate('/');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.15),transparent_30%),radial-gradient(circle_at_60%_80%,rgba(168,85,247,0.14),transparent_35%)]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/85 p-6 md:p-8 backdrop-blur-xl shadow-soft"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            New User
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-sm font-medium text-slate-700">Re-enter Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500"
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2.5 text-white font-semibold hover:shadow-glow disabled:opacity-60"
          >
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account & Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
