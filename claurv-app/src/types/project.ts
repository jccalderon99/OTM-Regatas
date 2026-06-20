export interface Hotspot {
  id: string;
  pitch: number;
  yaw: number;
  type: 'scene' | 'info' | 'media';
  text: string;
  sceneId?: string;
  mediaUrl?: string; // For media popup
  
  // Custom Icon Properties
  iconType?: 'arrow' | 'chevron-double' | 'info' | 'camera' | 'play' | 'location' | 'floor-circle' | 'floor-arrow' | 'image' | 'comment' | 'pin' | 'compass' | 'circle-dot';
  iconColor?: string;
  
  // Advanced Visuals
  animation?: 'none' | 'pulse' | 'float';
  scale?: number;
  opacity?: number;

  // XY coordinates for 'flat' scene types (percentage 0-100)
  x?: number;
  y?: number;
}

export interface Scene {
  title: string;
  image: string; // URL of the scene
  type: '360' | 'flat';
  hotSpots: Hotspot[];
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: '360' | 'flat';
  album: string; // "Root" by default
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  image: string; // Cover image URL (can be the first media item)
  createdAt: string;
  isPublic: boolean;
  scenes: Record<string, Scene>;
  defaultScene: string;
  mediaLibrary: MediaItem[];
}
