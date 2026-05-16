import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OTMProvider } from './context/OTMContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import NewOTM from './pages/requester/NewOTM';
import MyDashboard from './pages/requester/MyDashboard';
import CommandCenter from './pages/supervisor/CommandCenter';
import OTMManagement from './pages/supervisor/OTMManagement';
import MyTasks from './pages/technician/MyTasks';
import UserManagement from './pages/admin/UserManagement';
import { useRealtimeOTM } from './hooks/useRealtimeOTM';

function AppContent() {
  useRealtimeOTM();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  // Reset view when user role changes to avoid "stuck" interfaces
  useEffect(() => {
    setCurrentView('dashboard');
  }, [user?.id, user?.role]);

  if (!user) return <Login />;

  const defaultView = () => {
    switch (user.role) {
      case 'requester': return <MyDashboard />;
      case 'supervisor': return <CommandCenter />;
      case 'technician': return <MyTasks />;
      case 'jefatura': return <MyDashboard />;
      case 'admin': return <CommandCenter />;
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return defaultView();
      case 'new-otm': return <NewOTM onCreated={() => setCurrentView('dashboard')} />;
      case 'management': return <OTMManagement />;
      case 'my-tasks': return <MyTasks />;
      case 'users': return <UserManagement />;
      default: return defaultView();
    }
  };

  return (
    <DashboardLayout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OTMProvider>
        <AppContent />
      </OTMProvider>
    </AuthProvider>
  );
}
