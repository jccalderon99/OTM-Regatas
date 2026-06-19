import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import type { Project } from './components/Dashboard';
import TourViewer from './components/TourViewer';

function AppContent() {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // If user is not logged in and hasn't chosen guest mode, show login page
  if (!user && !isGuest) {
    return (
      <Login 
        onSuccess={() => setIsGuest(false)} 
        onGuest={() => setIsGuest(true)} 
      />
    );
  }

  // If user has opened a specific project tour
  if (activeProject) {
    return (
      <TourViewer 
        project={activeProject} 
        onBack={() => setActiveProject(null)} 
      />
    );
  }

  // Default: Show Project Dashboard
  return (
    <Dashboard 
      onOpenProject={(project) => setActiveProject(project)} 
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
