import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Profile from '../pages/Profile.jsx';
import WorkspaceDashboard from '../pages/WorkspaceDashboard.jsx';
import TeamDashboard from '../pages/TeamDashboard.jsx';
import ChatContainer from '../pages/ChatContainer.jsx';
import KanbanBoard from '../pages/KanbanBoard.jsx';
import DocumentWorkspace from '../pages/DocumentWorkspace.jsx';
import CodeSandbox from '../pages/CodeSandbox.jsx';
import WhiteboardWorkspace from '../pages/WhiteboardWorkspace.jsx';
import AiCopilot from '../pages/AiCopilot.jsx';
import SearchHub from '../pages/SearchHub.jsx';
import ActivityFeed from '../pages/ActivityFeed.jsx';
import WorkspaceSettings from '../pages/WorkspaceSettings.jsx';
import CalendarView from '../pages/CalendarView.jsx';
import AnalyticsDashboard from '../pages/AnalyticsDashboard.jsx';
import FilesHub from '../pages/FilesHub.jsx';
import AdminUserHub from '../pages/AdminUserHub.jsx';
import ForgotPassword from '../pages/ForgotPassword.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';
import VerifyEmail from '../pages/VerifyEmail.jsx';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';

const AppRoutes = () => {
  return (
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
  );
};

export default AppRoutes;
