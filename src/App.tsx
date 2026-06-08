import { useState, useEffect } from 'react';
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
import TechnicianCalendar from './pages/technician/TechnicianCalendar';
import SupervisorCalendar from './pages/supervisor/SupervisorCalendar';
import RoutineActivitiesAdmin from './pages/admin/RoutineActivitiesAdmin';
import RoutineRegister from './pages/technician/RoutineRegister';
import { RoutineActivityProvider } from './context/RoutineActivityContext';
import { useRealtimeOTM } from './hooks/useRealtimeOTM';
import WelcomePortal from './pages/WelcomePortal';
import Reports from './pages/Reports';
import NewOTI from './pages/supervisor/NewOTI';
import GanttChart from './pages/supervisor/GanttChart';
import LiveDashboardViewer from './pages/LiveDashboardViewer';
import DocumentScanner from './pages/DocumentScanner';

function AppContent() {
  useRealtimeOTM();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('portal');

  // Reset view when user role changes to avoid "stuck" interfaces
  useEffect(() => {
    setCurrentView('portal');
  }, [user?.id, user?.role]);

  if (!user) return <Login />;

  const defaultView = () => {
    switch (user.role) {
      case 'requester': return <MyDashboard />;
      case 'supervisor': return <LiveDashboardViewer />;
      case 'technician': return <MyTasks />;
      case 'jefatura': return <LiveDashboardViewer />;
      case 'admin': return <LiveDashboardViewer />;
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return defaultView();
      case 'new-otm': return <NewOTM onCreated={() => setCurrentView('dashboard')} />;
      case 'new-oti': return <NewOTI onCreated={() => setCurrentView('dashboard')} />;
      case 'management': return <OTMManagement />;
      case 'my-tasks': return <MyTasks />;
      case 'users': return <UserManagement />;
      case 'calendar': return user.role === 'technician' ? <TechnicianCalendar onNavigate={setCurrentView} /> : <SupervisorCalendar onNavigate={setCurrentView} />;
      case 'routine-admin': return <RoutineActivitiesAdmin />;
      case 'routine-register': return <RoutineRegister />;
      case 'reports': return <Reports />;
      case 'scanner': return <DocumentScanner />;
      case 'gantt': return user.role === 'technician' ? defaultView() : <GanttChart />;
      default: return defaultView();
    }
  };

  if (currentView === 'portal') {
    return <WelcomePortal onNavigate={setCurrentView} />;
  }

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
        <RoutineActivityProvider>
          <AppContent />
        </RoutineActivityProvider>
      </OTMProvider>
    </AuthProvider>
  );
}
