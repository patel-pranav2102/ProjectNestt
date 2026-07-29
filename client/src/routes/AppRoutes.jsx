import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';

// Core routes loaded eagerly for instant startup
import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Register from '../pages/Register.jsx';

// Lazy-loaded feature routes for code splitting & ultra-fast initial bundle loading
const Profile = lazy(() => import('../pages/Profile.jsx'));
const WorkspaceDashboard = lazy(() => import('../pages/WorkspaceDashboard.jsx'));
const TeamDashboard = lazy(() => import('../pages/TeamDashboard.jsx'));
const ChatContainer = lazy(() => import('../pages/ChatContainer.jsx'));
const KanbanBoard = lazy(() => import('../pages/KanbanBoard.jsx'));
const DocumentWorkspace = lazy(() => import('../pages/DocumentWorkspace.jsx'));
const CodeSandbox = lazy(() => import('../pages/CodeSandbox.jsx'));
const WhiteboardWorkspace = lazy(() => import('../pages/WhiteboardWorkspace.jsx'));
const AiCopilot = lazy(() => import('../pages/AiCopilot.jsx'));
const SearchHub = lazy(() => import('../pages/SearchHub.jsx'));
const ActivityFeed = lazy(() => import('../pages/ActivityFeed.jsx'));
const WorkspaceSettings = lazy(() => import('../pages/WorkspaceSettings.jsx'));
const CalendarView = lazy(() => import('../pages/CalendarView.jsx'));
const AnalyticsDashboard = lazy(() => import('../pages/AnalyticsDashboard.jsx'));
const FilesHub = lazy(() => import('../pages/FilesHub.jsx'));
const AdminUserHub = lazy(() => import('../pages/AdminUserHub.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail.jsx'));

// Sleek fallback loading spinner during dynamic chunk loading
const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <div className="w-8 h-8 border-3 border-brand-purple border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-400 font-display tracking-wide">Loading workspace module...</span>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
        {/* Protected App Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:id" 
          element={
            <ProtectedRoute>
              <WorkspaceDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/team/:teamId" 
          element={
            <ProtectedRoute>
              <TeamDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/chat" 
          element={
            <ProtectedRoute>
              <ChatContainer />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/project/:projectId/board" 
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/project/:projectId/docs" 
          element={
            <ProtectedRoute>
              <DocumentWorkspace />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/project/:projectId/sandbox" 
          element={
            <ProtectedRoute>
              <CodeSandbox />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/project/:projectId/whiteboard" 
          element={
            <ProtectedRoute>
              <WhiteboardWorkspace />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/project/:projectId/copilot" 
          element={
            <ProtectedRoute>
              <AiCopilot />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/search" 
          element={
            <ProtectedRoute>
              <SearchHub />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/settings" 
          element={
            <ProtectedRoute>
              <WorkspaceSettings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/calendar" 
          element={
            <ProtectedRoute>
              <CalendarView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/analytics" 
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:workspaceId/files" 
          element={
            <ProtectedRoute>
              <FilesHub />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <ActivityFeed />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute>
              <AdminUserHub />
            </ProtectedRoute>
          } 
        />
        
        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
