import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LayoutDashboard, WandSparkles, GalleryHorizontalEnd, Bookmark, Settings, Menu, X } from 'lucide-react';

// Pages
import LandingPage from './pages/LandingPage';
import RedesignPage from './pages/RedesignPage';
import ResultsPage from './pages/ResultsPage';
import SavedPage from './pages/SavedPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ChatbotPanel from './components/chat/ChatbotPanel';
import { getCurrentUser, isAuthenticated } from './utils/auth';

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function DashboardLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentUser = getCurrentUser();

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Design Room', to: '/design', icon: WandSparkles },
      { label: 'Results', to: '/results', icon: GalleryHorizontalEnd },
      { label: 'Saved Projects', to: '/saved', icon: Bookmark },
      { label: 'Settings', to: '/settings', icon: Settings }
    ],
    []
  );

  const activeItem = navItems.find((item) => location.pathname === item.to);

  return (
    <div className="min-h-screen bg-app">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.15),transparent_30%),radial-gradient(circle_at_60%_80%,rgba(168,85,247,0.14),transparent_35%)]" />

      <div className="relative grid grid-cols-12 gap-4 p-4 lg:p-6">
        <aside className={`col-span-12 ${collapsed ? 'lg:col-span-1 xl:col-span-1' : 'lg:col-span-3 xl:col-span-2'} glass-card sticky top-4 h-[calc(100vh-2rem)] p-4 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-glow" />
              {!collapsed && (
                <div>
                  <p className="text-xs text-slate-500">SpaceCraft</p>
                  <p className="font-semibold text-slate-900">AI 🚀</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="h-8 w-8 rounded-lg border border-white/30 bg-white/60 text-slate-700 hover:scale-105 transition-all"
            >
              {collapsed ? <Menu size={16} className="mx-auto" /> : <X size={16} className="mx-auto" />}
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-glow'
                      : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-white/90" />}
                  <Icon size={18} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className={`col-span-12 ${collapsed ? 'lg:col-span-11 xl:col-span-11' : 'lg:col-span-9 xl:col-span-10'} space-y-4`}>
          <header className="glass-card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Product Workspace</p>
              <h1 className="text-xl font-semibold text-slate-900">{activeItem?.label || 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-white/30 bg-white/60 px-3 py-2 text-xs text-slate-700">
                Breadcrumb: Home / {activeItem?.label || 'Dashboard'}
              </div>
              <div className="rounded-full border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700">
                {(currentUser?.username || 'User')} • Active
              </div>
            </div>
          </header>

          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="glass-card p-4 md:p-6"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Check API connection on mount
    const checkAPI = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/health');
        if (!response.ok) {
          console.warn('Backend API may not be running');
        }
      } catch (error) {
        console.warn('Backend API not available. Using mock data.');
      }
    };
    checkAPI();
  }, []);

  return (
    <Router>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/design" element={<RedesignPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isAuthenticated() && <ChatbotPanel />}
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;
