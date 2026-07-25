import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate, useLocation, Link } from 'react-router-dom';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import store from './features/store.js';
import { 
  selectCurrentUser, 
  selectIsAuthenticated, 
  setCredentials,
  logout as logoutAction 
} from './features/authSlice.js';
import { 
  setWorkspaces, 
  setActiveWorkspace, 
  selectActiveWorkspace,
  clearWorkspaces 
} from './features/workspaceSlice.js';
import { 
  setTeams, 
  clearTeams 
} from './features/teamSlice.js';
import { 
  setProjects, 
  clearProjects,
  selectActiveProject 
} from './features/projectSlice.js';
import {
  setChannels,
  clearChatStore
} from './features/chatSlice.js';
import {
  clearKanbanStore
} from './features/kanbanSlice.js';
import {
  clearDocumentStore
} from './features/documentSlice.js';
import {
  clearWhiteboardStore
} from './features/whiteboardSlice.js';
import {
  clearAiStore
} from './features/aiSlice.js';
import {
  setNotifications,
  addNotification,
  clearNotificationStore,
} from './features/notificationSlice.js';
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
import { LayoutDashboard, User, MessageSquare, CheckSquare, FileText, Terminal, Palette, Sparkles, Settings, Search, Bell, Calendar, BarChart2, Folder, Shield } from 'lucide-react';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const activeProject = useSelector(selectActiveProject);

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
        
        // Auto-select first workspace as active if none is selected
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
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen gradient-bg text-slate-100 flex flex-col justify-between selection:bg-brand-purple/30 selection:text-white">
      {/* Header Navbar */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center font-display font-extrabold text-white">
            P
          </div>
          <span className="text-lg font-bold font-display tracking-tight text-white">ProjectNest</span>
        </a>
        
        <nav className="flex items-center gap-6">
          <a href="/dashboard" className="text-xs font-semibold hover:text-brand-cyan transition-colors">Dashboard</a>
          
          {isAuthenticated ? (
            <>
              <a href="/profile" className="text-xs font-semibold hover:text-brand-cyan transition-colors flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.name?.[0].toUpperCase() || 'U'
                  )}
                </div>
                <span>Profile</span>
              </a>
              <NotificationBell />
              <button 
                onClick={handleLogout} 
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="text-xs font-semibold hover:text-brand-purple transition-colors">Login</a>
              <a href="/register" className="text-xs font-semibold hover:text-brand-purple transition-colors">Register</a>
            </>
          )}
        </nav>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Panel - Render only if User is Logged In */}
        {isAuthenticated && (
          <aside className="w-full md:w-64 glass-panel rounded-2xl flex flex-col p-4 text-left overflow-y-auto h-[fit-content] md:h-[80svh] shrink-0">
            <div className="mb-6 px-2">
              <h2 className="text-xl font-bold font-display text-white tracking-wide">Workspace Panel</h2>
              <span className="text-xs text-brand-cyan font-medium truncate block">
                {activeWorkspace ? activeWorkspace.name : 'Select a Workspace'}
              </span>
            </div>

            {/* Switcher and creation tools */}
            <div className="mb-2">
              <WorkspaceSwitcher />
            </div>

            {/* Subgroups Team list */}
            <div className="mb-2">
              <TeamList />
            </div>

            {/* Project list */}
            <div className="mb-4">
              <ProjectList />
            </div>

            {/* Menu Links */}
            <nav className="flex-1 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mb-1">Menus</div>
              
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                  ${location.pathname === '/dashboard' 
                    ? 'bg-brand-purple/10 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              {activeWorkspace && (
                <>
                  <Link 
                    to={`/workspace/${activeWorkspace._id}/settings`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/settings') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Settings size={16} />
                    <span>Workspace Settings</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/chat`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/chat') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <MessageSquare size={16} />
                    <span>Real-Time Chat</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/search`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/search') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Search size={16} />
                    <span>Global Search</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/calendar`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/calendar') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Calendar size={16} />
                    <span>Calendar</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/analytics`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/analytics') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <BarChart2 size={16} />
                    <span>Analytics</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/files`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/files') 
                        ? 'bg-brand-purple/10 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Folder size={16} />
                    <span>Files Library</span>
                  </Link>
                </>
              )}

              {activeProject && (
                <>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1.5">Project Menu</div>
                  <Link 
                    to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/board`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/board') 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <CheckSquare size={16} />
                    <span>Kanban Boards</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/docs`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/docs') 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <FileText size={16} />
                    <span>Document Notes</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/sandbox`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/sandbox') 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Terminal size={16} />
                    <span>Code Sandbox</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/whiteboard`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/whiteboard') 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Palette size={16} />
                    <span>Whiteboards</span>
                  </Link>

                  <Link 
                    to={`/workspace/${activeWorkspace._id}/project/${activeProject._id}/copilot`} 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname.endsWith('/copilot') 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Sparkles size={16} />
                    <span>AI Copilot</span>
                  </Link>
                </>
              )}

              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1.5">Settings</div>
              <Link 
                to="/notifications" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                  ${location.pathname === '/notifications' 
                    ? 'bg-brand-purple/10 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
              >
                <Bell size={16} />
                <span>Notifications</span>
              </Link>
              <Link 
                to="/profile" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                  ${location.pathname === '/profile' 
                    ? 'bg-brand-purple/10 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
              >
                <User size={16} />
                <span>Profile Settings</span>
              </Link>

              {currentUser?.role === 'Admin' && (
                <>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-2 mt-3 mb-1.5">Admin Control</div>
                  <Link 
                    to="/admin/users" 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors
                      ${location.pathname === '/admin/users' 
                        ? 'bg-brand-purple/10 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                  >
                    <Shield size={16} />
                    <span>User Management</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Logged user details in footer */}
            <div className="pt-4 mt-6 border-t border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
                <span className="text-[10px] text-brand-purple font-semibold uppercase tracking-wider block">
                  {currentUser?.role}
                </span>
              </div>
            </div>
          </aside>
        )}

        {/* Content Router area */}
        <main className="flex-1 min-w-0">
          <AppRoutes />
        </main>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-900">
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
