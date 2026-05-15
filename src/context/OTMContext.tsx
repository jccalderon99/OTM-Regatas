import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { OTMRequest, OTMStatusLog, OTMStatus, Profile } from '../types';
import { DEMO_OTMS, DEMO_STATUS_LOGS, DEMO_USERS, generateOTMCode, getDemoOTMsForUser } from '../lib/demoData';
import { useAuth } from './AuthContext';
import { AREAS as INITIAL_AREAS, FAILURE_TYPES as INITIAL_FAILURES } from '../types';

interface OTMContextType {
  otms: OTMRequest[];
  statusLogs: OTMStatusLog[];
  getOTMsForCurrentUser: () => OTMRequest[];
  getOTMById: (id: string) => OTMRequest | undefined;
  createOTM: (data: Partial<OTMRequest>) => OTMRequest;
  updateOTMStatus: (otmId: string, newStatus: OTMStatus, notes?: string) => void;
  assignOTM: (otmId: string, technicianId: string, scheduledDate: string, supervisorNotes?: string) => void;
  addTechnicianNotes: (otmId: string, notes: string) => void;
  submitConformity: (otmId: string, rating: number, notes: string, signatureUrl?: string | null) => void;
  submitConformity: (otmId: string, rating: number, notes: string, signatureUrl?: string | null) => void;
  refreshOTMs: () => void;
  // Master Data
  users: Profile[];
  addUser: (user: Profile) => void;
  updateUser: (user: Profile) => void;
  areas: string[];
  addArea: (area: string) => void;
  updateArea: (oldArea: string, newArea: string) => void;
  specialties: string[];
  addSpecialty: (specialty: string) => void;
  updateSpecialty: (oldSpecialty: string, newSpecialty: string) => void;
}

const OTMContext = createContext<OTMContextType | null>(null);

export function OTMProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [otms, setOTMs] = useState<OTMRequest[]>([...DEMO_OTMS]);
  const [statusLogs, setLogs] = useState<OTMStatusLog[]>([...DEMO_STATUS_LOGS]);
  
  // Master Data States
  const [users, setUsers] = useState<Profile[]>([...DEMO_USERS]);
  const [areas, setAreas] = useState<string[]>([...INITIAL_AREAS]);
  const [specialties, setSpecialties] = useState<string[]>([...INITIAL_FAILURES]);

  const addUser = useCallback((newUser: Profile) => setUsers(prev => [...prev, newUser]), []);
  const updateUser = useCallback((updated: Profile) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)), []);
  const addArea = useCallback((area: string) => setAreas(prev => [...prev, area]), []);
  const updateArea = useCallback((oldArea: string, newArea: string) => setAreas(prev => prev.map(a => a === oldArea ? newArea : a)), []);
  const addSpecialty = useCallback((spec: string) => setSpecialties(prev => [...prev, spec]), []);
  const updateSpecialty = useCallback((oldSpec: string, newSpec: string) => setSpecialties(prev => prev.map(s => s === oldSpec ? newSpec : s)), []);

  const getOTMsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'requester') return otms.filter(o => o.area_sector === user.area_sector);
    if (user.role === 'technician') return otms.filter(o => o.technician_id === user.id);
    return otms;
  }, [otms, user]);

  const getOTMById = useCallback((id: string) => otms.find(o => o.id === id), [otms]);

  const addLog = (otmId: string, prevStatus: string | null, newStatus: string, notes?: string) => {
    if (!user) return;
    const log: OTMStatusLog = {
      id: `log-${Date.now()}`, otm_id: otmId, previous_status: prevStatus,
      new_status: newStatus, changed_by: user.id, notes: notes || null,
      created_at: new Date().toISOString(),
    };
    setLogs(prev => [...prev, log]);
  };

  const createOTM = useCallback((data: Partial<OTMRequest>): OTMRequest => {
    const newOTM: OTMRequest = {
      id: `otm-${Date.now()}`, otm_code: generateOTMCode(),
      requester_id: user!.id, requester_name: user!.full_name,
      area_sector: user!.area_sector || data.area_sector || '',
      exact_location: data.exact_location || null,
      failure_type: data.failure_type || '', asset: data.asset || null,
      description: data.description || '', urgency: data.urgency || 'medium',
      location: data.location || null,
      supervisor_id: null, supervisor_notes: null, scheduled_date: null,
      technician_id: null, technician_notes: null,
      status: 'pending',
      conformity_rating: null, conformity_notes: null,
      conformity_signature_url: null, conformity_date: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), closed_at: null,
    };
    setOTMs(prev => [newOTM, ...prev]);
    addLog(newOTM.id, null, 'pending', 'Solicitud creada');
    return newOTM;
  }, [user]);

  const updateOTMStatus = useCallback((otmId: string, newStatus: OTMStatus, notes?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      const updated = { ...o, status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'closed') updated.closed_at = new Date().toISOString();
      addLog(otmId, o.status, newStatus, notes);
      return updated;
    }));
  }, [user]);

  const assignOTM = useCallback((otmId: string, technicianId: string, scheduledDate: string, supervisorNotes?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'scheduled', `Asignado. ${supervisorNotes || ''}`);
      return {
        ...o, technician_id: technicianId, scheduled_date: scheduledDate,
        supervisor_id: user!.id, supervisor_notes: supervisorNotes || o.supervisor_notes,
        status: 'scheduled' as OTMStatus, updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const addTechnicianNotes = useCallback((otmId: string, notes: string) => {
    setOTMs(prev => prev.map(o =>
      o.id === otmId ? { ...o, technician_notes: notes, updated_at: new Date().toISOString() } : o
    ));
  }, []);

  const submitConformity = useCallback((otmId: string, rating: number, notes: string, signatureUrl: string | null = null) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'closed', `Conformidad: ${rating}/5`);
      return {
        ...o, status: 'closed' as OTMStatus, conformity_rating: rating,
        conformity_notes: notes, conformity_signature_url: signatureUrl, conformity_date: new Date().toISOString(),
        closed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const refreshOTMs = useCallback(() => {}, []);

  return (
    <OTMContext.Provider value={{
      otms, statusLogs, getOTMsForCurrentUser, getOTMById,
      createOTM, updateOTMStatus, assignOTM, addTechnicianNotes, submitConformity, refreshOTMs,
      users, addUser, updateUser,
      areas, addArea, updateArea,
      specialties, addSpecialty, updateSpecialty
    }}>
      {children}
    </OTMContext.Provider>
  );
}

export function useOTM(): OTMContextType {
  const ctx = useContext(OTMContext);
  if (!ctx) throw new Error('useOTM must be used within OTMProvider');
  return ctx;
}
