import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OTMProvider } from './context/OTMContext';
import Login from './pages/Login';
import DashboardLayout, { isViewPermitted } from './layouts/DashboardLayout';
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
import PreventiveMaintenancePlan from './pages/admin/PreventiveMaintenancePlan';
import BudgetDashboard from './pages/admin/BudgetDashboard';
import { RQProvider } from './context/RQContext';
import RQLog from './pages/admin/RQLog';
import AIRulesAdmin from './pages/admin/AIRulesAdmin';


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
      case 'jefatura': return <MyDashboard />;
      case 'admin': return <LiveDashboardViewer />;
    }
  };

  const renderView = () => {
    if (currentView !== 'portal' && !isViewPermitted(currentView, user)) {
      return defaultView();
    }

    switch (currentView) {
      case 'dashboard': return defaultView();
      case 'new-otm': return <NewOTM onCreated={() => setCurrentView('dashboard')} />;
      case 'new-oti': return <NewOTI onCreated={() => setCurrentView('dashboard')} />;
      case 'management': return <OTMManagement onNavigate={setCurrentView} />;
      case 'my-tasks': return <MyTasks />;
      case 'users': return <UserManagement />;
      case 'calendar': return user.role === 'technician' ? <TechnicianCalendar onNavigate={setCurrentView} /> : <SupervisorCalendar onNavigate={setCurrentView} />;
      case 'routine-admin': return <RoutineActivitiesAdmin />;
      case 'routine-register': return <RoutineRegister />;
      case 'reports': return <Reports />;
      case 'gantt': return <GanttChart />;
      case 'preventive-plan': return <PreventiveMaintenancePlan />;
      case 'budget': return <BudgetDashboard />;
      case 'rq-log': return <RQLog onNavigate={setCurrentView} />;
      case 'ai-rules': return <AIRulesAdmin />;
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
        <RQProvider>
          <RoutineActivityProvider>
            <AppContent />
          </RoutineActivityProvider>
        </RQProvider>
      </OTMProvider>
    </AuthProvider>
  );
}
