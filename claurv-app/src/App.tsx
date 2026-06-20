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
          onGoToEditor={async (selectedIds: string[]) => {
            // Generate scenes for selected images if they don't exist
            const updated = { ...activeProject };
            let changed = false;
            
            selectedIds.forEach(id => {
              const media = updated.mediaLibrary.find(m => m.id === id);
              if (media) {
                // Find if a scene already uses this media url
                const exists = Object.values(updated.scenes).some(sc => sc.image === media.url);
                if (!exists) {
                  const newSceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
                  updated.scenes[newSceneId] = {
                    title: media.name,
                    image: media.url,
                    type: media.type,
                    hotSpots: []
                  };
                  if (Object.keys(updated.scenes).length === 1) {
                    updated.defaultScene = newSceneId;
                  }
                  changed = true;
                }
              }
            });
            
            if (changed) {
              setActiveProject(updated);
            }
            
            setViewMode('editor');
          }}
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
      onExitGuest={() => setIsGuest(false)}
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
