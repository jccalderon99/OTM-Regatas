import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AttendanceRecord } from '../types';
import { useAuth } from './AuthContext';
import { DEMO_USERS } from '../lib/demoData';

interface AttendanceContextType {
  records: AttendanceRecord[];
  getRecordToday: (userId: string) => AttendanceRecord | undefined;
  checkIn: (lat: number, lng: number) => Promise<void>;
  checkOut: (lat: number, lng: number) => Promise<void>;
  updateRecord: (recordId: string, fields: Partial<AttendanceRecord>) => void;
  geoConfig: {
    lat: number;
    lng: number;
    maxDistance: number;
  };
  updateGeoConfig: (lat: number, lng: number, maxDistance: number) => void;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in meters
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Load geo config from localStorage or defaults
  const [geoConfig, setGeoConfig] = useState(() => {
    const saved = localStorage.getItem('geo_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && typeof parsed.maxDistance === 'number') {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      lat: -12.165922059229729,
      lng: -77.03230912632046,
      maxDistance: 400
    };
  });

  const updateGeoConfig = useCallback((lat: number, lng: number, maxDistance: number) => {
    const newConfig = { lat, lng, maxDistance };
    setGeoConfig(newConfig);
    localStorage.setItem('geo_config', JSON.stringify(newConfig));
  }, []);
  
  // Simulated initial records (so the table isn't empty)
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const dummyRecords: AttendanceRecord[] = [];
    const technicians = DEMO_USERS.filter(u => u.role === 'technician');
    
    // Add dummy data for first 5 techs
    for (let i = 0; i < 5; i++) {
      const tech = technicians[i];
      if (tech) {
        const isLate = i % 2 === 0;
        dummyRecords.push({
          id: `att-demo-${i}`,
          user_id: tech.id,
          date: today,
          check_in_time: isLate ? '08:15' : '07:50',
          check_out_time: null,
          check_in_location: { lat: geoConfig.lat, lng: geoConfig.lng },
          check_out_location: null,
          tags: isLate ? ['Tarde'] : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: tech
        });
      }
    }
    return dummyRecords;
  });

  const getRecordToday = useCallback((userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return records.find(r => r.user_id === userId && r.date === today);
  }, [records]);

  const checkIn = useCallback(async (lat: number, lng: number) => {
    if (!user) throw new Error("No autenticado");
    
    const distance = getDistanceFromLatLonInMeters(lat, lng, geoConfig.lat, geoConfig.lng);
    if (distance > geoConfig.maxDistance) {
      throw new Error(`Ubicación fuera de rango. Estás a ${Math.round(distance)}m del club (Límite: ${geoConfig.maxDistance}m).`);
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    // Check if late (after 08:00 AM)
    const tags = [];
    if (now.getHours() >= 8 && now.getMinutes() > 0) {
      tags.push('Tarde');
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      user_id: user.id,
      date: today,
      check_in_time: timeString,
      check_out_time: null,
      check_in_location: { lat, lng },
      check_out_location: null,
      tags,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      user
    };

    setRecords(prev => [...prev, newRecord]);
  }, [user, geoConfig]);

  const checkOut = useCallback(async (lat: number, lng: number) => {
    if (!user) throw new Error("No autenticado");
    
    const distance = getDistanceFromLatLonInMeters(lat, lng, geoConfig.lat, geoConfig.lng);
    if (distance > geoConfig.maxDistance) {
      throw new Error(`Ubicación fuera de rango. Estás a ${Math.round(distance)}m del club.`);
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    setRecords(prev => prev.map(r => {
      if (r.user_id === user.id && r.date === today) {
        return {
          ...r,
          check_out_time: timeString,
          check_out_location: { lat, lng },
          updated_at: now.toISOString()
        };
      }
      return r;
    }));
  }, [user, geoConfig]);

  const updateRecord = useCallback((recordId: string, fields: Partial<AttendanceRecord>) => {
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...fields, updated_at: new Date().toISOString() } : r));
  }, []);

  return (
    <AttendanceContext.Provider value={{ records, getRecordToday, checkIn, checkOut, updateRecord, geoConfig, updateGeoConfig }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
}
