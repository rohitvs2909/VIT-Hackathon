import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Palette, Shield, Sparkles } from 'lucide-react';
import { logout } from '../utils/auth';

const settingsItems = [
  {
    title: 'Visual Theme',
    subtitle: 'Premium mode enabled with layered gradients and glass UI.',
    icon: Palette
  },
  {
    title: 'Notifications',
    subtitle: 'Get alerts when room generation and saves are complete.',
    icon: Bell
  },
  {
    title: 'Privacy Controls',
    subtitle: 'Manage upload visibility and project access preferences.',
    icon: Shield
  }
];

export default function SettingsPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Settings</h2>
        <p className="mt-2 text-slate-600">Tune your product workspace and personalization options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {settingsItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-5 shadow-soft hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white flex items-center justify-center mb-4">
                <Icon size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{item.subtitle}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-5">
        <div className="flex items-center gap-3 text-indigo-700">
          <Sparkles size={18} />
          <p className="font-medium">Premium SaaS UI mode is active.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Account</h3>
        <p className="mt-1 text-sm text-slate-600">Logout from this device session.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
