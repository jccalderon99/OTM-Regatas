import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import type { Project } from './types/project';
import TourViewer from './components/TourViewer';
import MediaManager from './components/MediaManager';

function AppContent() {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'media' | 'editor'>('dashboard');
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

  // If user has opened a specific project
  if (activeProject) {
    if (viewMode === 'editor') {
      return (
        <TourViewer 
          project={activeProject} 
          onBack={() => {
            setActiveProject(null);
            setViewMode('dashboard');
          }} 
        />
      );
    }
    
    // Default to media manager if opened by admin, but if guest, go straight to viewer?
    // Actually for guest they should go straight to viewer
    if (viewMode === 'media') {
      if (isGuest) {
        setViewMode('editor');
        return null;
      }
      return (
        <MediaManager
          project={activeProject}
          onBack={() => {
            setActiveProject(null);
            setViewMode('dashboard');
          }}
          onGoToEditor={() => setViewMode('editor')}
        />
      );
    }
  }

  // Default: Show Project Dashboard
  return (
    <Dashboard 
      onOpenProject={(project) => {
        setActiveProject(project);
        // Guests bypass media manager
        setViewMode(isGuest ? 'editor' : 'media');
      }} 
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
