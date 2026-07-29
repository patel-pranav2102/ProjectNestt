import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Provider as ReduxProvider, useSelector, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import store from './features/store.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { 
  selectCurrentUser, 
  selectIsAuthenticated, 
  setCredentials, 
  logout as logoutAction 
} from './features/authSlice.js';
import { 
  selectActiveWorkspace, 
  setWorkspaces, 
  setActiveWorkspace, 
  clearWorkspaces 
} from './features/workspaceSlice.js';
import { setTeams, clearTeams } from './features/teamSlice.js';
import { selectActiveProject, setProjects, clearProjects } from './features/projectSlice.js';
import { setChannels, clearChatStore } from './features/chatSlice.js';
import { clearKanbanStore } from './features/kanbanSlice.js';
import { clearDocumentStore } from './features/documentSlice.js';
import { clearWhiteboardStore } from './features/whiteboardSlice.js';
import { clearAiStore } from './features/aiSlice.js';
import { setNotifications, clearNotificationStore } from './features/notificationSlice.js';
import { logoutUser, fetchUserProfile } from './services/authService.js';
import { fetchMyWorkspaces } from './services/workspaceService.js';
import { fetchTeamsInWorkspace } from './services/teamService.js';
import { fetchProjectsInWorkspace } from './services/projectService.js';
import { fetchWorkspaceChannels } from './services/chatService.js';
import { fetchNotifications } from './services/notificationService.js';
import { socket, initSocket, disconnectSocket } from './services/socketService.js';
import WorkspaceSwitcher from './components/dashboard/WorkspaceSwitcher.jsx';
import TeamList from './components/dashboard/TeamList.jsx';
import ProjectList from './components/dashboard/ProjectList.jsx';
import NotificationBell from './components/common/NotificationBell.jsx';
import { LayoutDashboard, User, MessageSquare, CheckSquare, FileText, Terminal, Palette, Sparkles, Settings, Search, Bell, Calendar, BarChart2, Folder, Shield, Menu, X } from 'lucide-react';

// Initialize TanStack Query Client with performance caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes cache validity
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention
      retry: 1,
    },
  },
});

const SidebarContent = ({ onItemClick }) => {
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const activeProject = useSelector(selectActiveProject);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1 scrollbar-none select-none">
      <div className="mb-4 px-1">
        <h2 className="text-sm font-bold font-display text-white tracking-wide uppercase">Workspace Navigation</h2>
        <span className="text-xs text-brand-cyan font-medium truncate block mt-0.5">
          {activeWorkspace ? activeWorkspace.name : 'Select a Workspace'}
        </span>
      </div>

      <div className="mb-2" onClick={onItemClick}>
        <WorkspaceSwitcher />
      </div>

      <div className="mb-2" onClick={onItemClick}>
        <TeamList />
      </div>

      <div className="mb-4" onClick={onItemClick}>
        <ProjectList />
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mb-1">Menus</div>
        
        <Link 
          to="/dashboard" 
          onClick={onItemClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
            ${location.pathname === '/dashboard' 
              ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </Link>

        {activeWorkspace && (
          <>
            <Link 
              to={`/workspace/${activeWorkspace._id}/settings`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/settings') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Settings size={15} />
              <span>Workspace Settings</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/chat`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/chat') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <MessageSquare size={15} />
              <span>Real-Time Chat</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/search`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/search') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Search size={15} />
              <span>Global Search</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/calendar`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/calendar') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Calendar size={15} />
              <span>Calendar</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/analytics`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/analytics') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <BarChart2 size={15} />
              <span>Analytics</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/files`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/files') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Folder size={15} />
              <span>Files Library</span>
            </Link>
          </>
        )}

        {activeProject && (
          <>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1">Project Menu</div>
            <Link 
              to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/board`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/board') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <CheckSquare size={15} />
              <span>Kanban Boards</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/docs`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/docs') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <FileText size={15} />
              <span>Document Notes</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/sandbox`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/sandbox') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Terminal size={15} />
              <span>Code Sandbox</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/whiteboard`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/whiteboard') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Palette size={15} />
              <span>Whiteboards</span>
            </Link>

            <Link 
              to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/copilot`} 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname.endsWith('/copilot') 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Sparkles size={15} />
              <span>AI Copilot</span>
            </Link>
          </>
        )}

        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1">Settings</div>
        <Link 
          to="/notifications" 
          onClick={onItemClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
            ${location.pathname === '/notifications' 
              ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
        >
          <Bell size={15} />
          <span>Notifications</span>
        </Link>
        <Link 
          to="/profile" 
          onClick={onItemClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
            ${location.pathname === '/profile' 
              ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
        >
          <User size={15} />
          <span>Profile Settings</span>
        </Link>

        {currentUser?.role === 'Admin' && (
          <>
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1">Admin Control</div>
            <Link 
              to="/admin/users" 
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all
                ${location.pathname === '/admin/users' 
                  ? 'bg-brand-purple/15 text-white font-semibold border border-brand-purple/30' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
            >
              <Shield size={15} />
              <span>User Management</span>
            </Link>
          </>
        )}
      </nav>

      {/* Logged user details in footer */}
      <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            currentUser?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
          <span className="text-[9px] text-brand-purple font-semibold uppercase tracking-wider block">
            {currentUser?.role}
          </span>
        </div>
      </div>
    </div>
  );
};

function AppLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const activeWorkspace = useSelector(selectActiveWorkspace);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load user profile details on app mount / refresh if authenticated
  useEffect(() => {
    if (!isAuthenticated || currentUser) return;

    const loadProfile = async () => {
      try {
        const data = await fetchUserProfile();
        dispatch(setCredentials({ user: data.user, token: localStorage.getItem('token') }));
      } catch (err) {
        console.error('Failed to load user profile:', err);
        dispatch(logoutAction());
      }
    };

    loadProfile();
  }, [isAuthenticated, currentUser, dispatch]);

  // Connect/disconnect socket globally based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        initSocket(token, dispatch);
      }
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, dispatch]);

  // Load workspaces on login
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadWorkspaces = async () => {
      try {
        const data = await fetchMyWorkspaces();
        dispatch(setWorkspaces(data.workspaces));
        
        if (data.workspaces.length > 0 && !activeWorkspace) {
          dispatch(setActiveWorkspace(data.workspaces[0]));
        }
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      }
    };

    loadWorkspaces();
  }, [isAuthenticated, dispatch]);

  // Load notifications on login
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications({ limit: 20 })
      .then(data => dispatch(setNotifications({ notifications: data.notifications, unreadCount: data.unreadCount })))
      .catch(() => {});
  }, [isAuthenticated, dispatch]);

  // Load teams when active workspace changes
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspace) {
      dispatch(clearTeams());
      return;
    }

    const loadTeams = async () => {
      try {
        const data = await fetchTeamsInWorkspace(activeWorkspace._id);
        dispatch(setTeams(data.teams));
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };

    loadTeams();
  }, [activeWorkspace, isAuthenticated, dispatch]);

  // Load projects when active workspace changes
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspace) {
      dispatch(clearProjects());
      return;
    }

    const loadProjects = async () => {
      try {
        const data = await fetchProjectsInWorkspace(activeWorkspace._id);
        dispatch(setProjects(data.projects));
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };

    loadProjects();
  }, [activeWorkspace, isAuthenticated, dispatch]);

  // Load channels when active workspace changes
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspace) {
      dispatch(clearChatStore());
      return;
    }

    const loadChannels = async () => {
      try {
        const data = await fetchWorkspaceChannels(activeWorkspace._id);
        dispatch(setChannels(data.channels));
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    };

    loadChannels();
  }, [activeWorkspace, isAuthenticated, dispatch]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      disconnectSocket();
      dispatch(logoutAction());
      dispatch(clearWorkspaces());
      dispatch(clearTeams());
      dispatch(clearProjects());
      dispatch(clearChatStore());
      dispatch(clearKanbanStore());
      dispatch(clearDocumentStore());
      dispatch(clearWhiteboardStore());
      dispatch(clearAiStore());
      dispatch(clearNotificationStore());
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen gradient-bg text-slate-100 flex flex-col justify-between selection:bg-brand-purple/30 selection:text-white">
      {/* Header Navbar */}
      <header className="glass-panel sticky top-0 z-50 px-4 md:px-6 py-3.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Hamburger Trigger */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle Mobile Navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}

          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-purple to-indigo-600 flex items-center justify-center font-display font-black text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
              P
            </div>
            <span className="text-base font-extrabold font-display tracking-tight text-white group-hover:text-slate-200 transition-colors hidden sm:inline">
              ProjectNest
            </span>
          </a>
        </div>
        
        <nav className="flex items-center gap-3 md:gap-5">
          <a href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden xs:inline">
            Dashboard
          </a>
          
          {isAuthenticated ? (
            <>
              <a href="/profile" className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.name?.[0].toUpperCase() || 'U'
                  )}
                </div>
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{currentUser?.name || 'Profile'}</span>
              </a>
              <NotificationBell />
              <button 
                onClick={handleLogout} 
                className="text-xs font-semibold text-rose-400/90 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-500/10"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">Login</a>
              <a href="/register" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white shadow-sm transition-all">Register</a>
            </>
          )}
        </nav>
      </header>

      {/* Mobile Sliding Sidebar Drawer Overlay */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md md:hidden flex justify-start animate-fadeIn">
          <aside className="w-4/5 max-w-xs h-full bg-slate-950 border-r border-slate-800/90 p-4 flex flex-col text-left shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </aside>
          
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Desktop Sidebar Panel */}
        {isAuthenticated && (
          <aside className="hidden md:flex w-64 glass-panel rounded-2xl flex-col p-4 text-left overflow-hidden h-[82svh] shrink-0 border border-slate-800/80">
            <SidebarContent onItemClick={() => {}} />
          </aside>
        )}

        {/* Main View Area */}
        <main className="flex-1 min-w-0">
          <AppRoutes />
        </main>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-medium text-slate-500 border-t border-slate-900">
        <p>&copy; {new Date().getFullYear()} ProjectNest Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}

export default App;
