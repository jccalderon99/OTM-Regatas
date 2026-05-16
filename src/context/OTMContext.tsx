import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { OTMRequest, OTMStatusLog, OTMStatus, Profile, AssignmentType, RQType, RQMagnitude, CancellationReason } from '../types';
import { DEMO_OTMS, DEMO_STATUS_LOGS, DEMO_USERS, generateOTMCode, getDemoOTMsForUser } from '../lib/demoData';
import { useAuth } from './AuthContext';
import { AREAS as INITIAL_AREAS, FAILURE_TYPES as INITIAL_FAILURES, LOCATIONS as INITIAL_LOCATIONS } from '../types';

interface OTMContextType {
  otms: OTMRequest[];
  statusLogs: OTMStatusLog[];
  getOTMsForCurrentUser: () => OTMRequest[];
  getOTMById: (id: string) => OTMRequest | undefined;
  createOTM: (data: Partial<OTMRequest>) => OTMRequest;
  updateOTMStatus: (otmId: string, newStatus: OTMStatus, notes?: string) => void;
  assignOTM: (otmId: string, technicianId: string, scheduledDate: string, supervisorNotes?: string) => void;
  assignSupervisor: (otmId: string, supervisorId: string) => void;
  assignContractor: (otmId: string, name: string, date: string, detail: string) => void;
  createRQ: (otmId: string, rqType: 'supply' | 'service', data: { materials?: string; quantities?: string; serviceDesc?: string; magnitude?: 'puntual' | 'integral' }) => void;
  cancelOTM: (otmId: string, reason: string, detail?: string) => void;
  updateOTMFields: (otmId: string, fields: Partial<OTMRequest>) => void;
  startTechnicianWork: (otmId: string) => void;
  finishTechnicianWork: (otmId: string, notes: string, photos: { file_url: string, file_name: string }[]) => void;
  approveWork: (otmId: string, notes?: string, start_time?: string, end_time?: string) => void;
  submitConformity: (otmId: string, rating: number, notes: string, signatureUrl?: string | null) => void;
  refreshOTMs: () => void;
  // Master Data
  users: Profile[];
  supervisors: Profile[];
  addUser: (user: Profile) => void;
  updateUser: (user: Profile) => void;
  areas: string[];
  addArea: (area: string) => void;
  updateArea: (oldArea: string, newArea: string) => void;
  specialties: string[];
  addSpecialty: (specialty: string) => void;
  updateSpecialty: (oldSpecialty: string, newSpecialty: string) => void;
  locations: string[];
  addLocation: (location: string) => void;
  updateLocation: (oldLocation: string, newLocation: string) => void;
  deleteUser: (id: string) => void;
  deleteArea: (name: string) => void;
  deleteSpecialty: (name: string) => void;
  deleteLocation: (name: string) => void;
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
  const [locations, setLocations] = useState<string[]>([...INITIAL_LOCATIONS]);

  const supervisors = useMemo(() => users.filter(u => u.role === 'supervisor'), [users]);

  const addUser = useCallback((newUser: Profile) => setUsers(prev => [...prev, newUser]), []);
  const updateUser = useCallback((updated: Profile) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)), []);
  const addArea = useCallback((area: string) => setAreas(prev => [...prev, area]), []);
  const updateArea = useCallback((oldArea: string, newArea: string) => setAreas(prev => prev.map(a => a === oldArea ? newArea : a)), []);
  const addSpecialty = useCallback((spec: string) => setSpecialties(prev => [...prev, spec]), []);
  const updateSpecialty = useCallback((oldSpec: string, newSpec: string) => setSpecialties(prev => prev.map(s => s === oldSpec ? newSpec : s)), []);
  const addLocation = useCallback((loc: string) => setLocations(prev => [...prev, loc]), []);
  const updateLocation = useCallback((oldLoc: string, newLoc: string) => setLocations(prev => prev.map(l => l === oldLoc ? newLoc : l)), []);

  const deleteUser = useCallback((id: string) => setUsers(prev => prev.filter(u => u.id !== id)), []);
  const deleteArea = useCallback((name: string) => setAreas(prev => prev.filter(a => a !== name)), []);
  const deleteSpecialty = useCallback((name: string) => setSpecialties(prev => prev.filter(s => s !== name)), []);
  const deleteLocation = useCallback((name: string) => setLocations(prev => prev.filter(l => l !== name)), []);

  const getOTMsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'requester') {
      return otms.filter(o => o.requester_id === user.id || o.area_sector === user.area_sector);
    }
    if (user.role === 'technician') return otms.filter(o => o.technician_id === user.id);
    return otms;
  }, [otms, user]);

  const getOTMById = useCallback((id: string) => otms.find(o => o.id === id), [otms]);

  const addLog = (otmId: string, prevStatus: string | null, newStatus: string, notes?: string) => {
    if (!user) return;
    const log: OTMStatusLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      otm_id: otmId, previous_status: prevStatus,
      new_status: newStatus, changed_by: user.id, notes: notes || null,
      created_at: new Date().toISOString(),
    };
    setLogs(prev => [...prev, log]);
  };

  const createOTM = useCallback((data: Partial<OTMRequest>): OTMRequest => {
    const finalArea = data.area_sector || user!.area_sector || '';
    const finalSpecialty = data.failure_type || '';
    const newOTM: OTMRequest = {
      id: `otm-${Date.now()}`, otm_code: generateOTMCode(finalArea, finalSpecialty, otms.length + 1),
      requester_id: user!.id, requester_name: user!.full_name,
      area_sector: finalArea,
      exact_location: data.exact_location || null,
      failure_type: finalSpecialty, asset: data.asset || null,
      description: data.description || '', urgency: data.urgency || 'medium',
      location: data.location || null,
      supervisor_id: null, supervisor_notes: null, scheduled_date: null,
      technician_id: null, technician_notes: null,
      status: 'pending',
      maintenance_type: null, job_start_time: null, job_end_time: null,
      conformity_rating: null, conformity_notes: null,
      conformity_signature_url: null, conformity_date: null,
      assignment_type: null, contractor_name: null, contractor_date: null, contractor_detail: null,
      rq_type: null, rq_date: null, rq_materials: null, rq_quantities: null, rq_service_desc: null, rq_magnitude: null,
      cancellation_reason: null, cancellation_detail: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), closed_at: null,
      attachments: data.attachments || [],
    };
    setOTMs(prev => [newOTM, ...prev]);
    addLog(newOTM.id, null, 'pending', 'Solicitud creada');
    return newOTM;
  }, [user, otms]);

  const updateOTMStatus = useCallback((otmId: string, newStatus: OTMStatus, notes?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      const updated = { ...o, status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'closed') updated.closed_at = new Date().toISOString();
      addLog(otmId, o.status, newStatus, notes);
      return updated;
    }));
  }, [user]);

  const assignSupervisor = useCallback((otmId: string, supervisorId: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      return { ...o, supervisor_id: supervisorId, updated_at: new Date().toISOString() };
    }));
  }, []);

  const assignOTM = useCallback((otmId: string, technicianId: string, scheduledDate: string, supervisorNotes?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'scheduled', `Asignado (Personal Propio). ${supervisorNotes || ''}`);
      return {
        ...o, technician_id: technicianId, scheduled_date: scheduledDate,
        supervisor_id: o.supervisor_id || user!.id, supervisor_notes: supervisorNotes || o.supervisor_notes,
        assignment_type: 'own' as AssignmentType,
        status: 'scheduled' as OTMStatus, updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const assignContractor = useCallback((otmId: string, name: string, date: string, detail: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'scheduled', `Asignado (Tercero: ${name})`);
      return {
        ...o, assignment_type: 'contractor' as AssignmentType,
        contractor_name: name, contractor_date: date, contractor_detail: detail,
        supervisor_id: o.supervisor_id || user!.id,
        status: 'scheduled' as OTMStatus, updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const createRQ = useCallback((otmId: string, rqType: 'supply' | 'service', data: { materials?: string; quantities?: string; serviceDesc?: string; magnitude?: 'puntual' | 'integral' }) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      const label = rqType === 'supply' ? 'RQ Suministro' : 'RQ Servicio';
      addLog(otmId, o.status, 'rq', `${label} registrado`);
      return {
        ...o, rq_type: rqType as RQType,
        rq_date: new Date().toISOString(),
        rq_materials: data.materials || null, rq_quantities: data.quantities || null,
        rq_service_desc: data.serviceDesc || null, rq_magnitude: (data.magnitude || null) as RQMagnitude,
        status: 'rq' as OTMStatus,
        updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const cancelOTM = useCallback((otmId: string, reason: string, detail?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'cancelled', `Cancelado: ${reason}${detail ? ' — ' + detail : ''}`);
      return {
        ...o, status: 'cancelled' as OTMStatus,
        cancellation_reason: reason as CancellationReason,
        cancellation_detail: detail || null,
        updated_at: new Date().toISOString(),
      };
    }));
  }, [user]);

  const updateOTMFields = useCallback((otmId: string, fields: Partial<OTMRequest>) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      return { ...o, ...fields, updated_at: new Date().toISOString() };
    }));
  }, []);

  const startTechnicianWork = useCallback((otmId: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'in_progress', 'Técnico inició el trabajo');
      return { ...o, status: 'in_progress' as OTMStatus, job_start_time: new Date().toISOString(), updated_at: new Date().toISOString() };
    }));
  }, [user]);

  const finishTechnicianWork = useCallback((otmId: string, notes: string, photos: { file_url: string, file_name: string }[]) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'awaiting_supervisor', 'Trabajo finalizado por técnico, esperando visto bueno');
      
      const newAttachments = photos.map((p, i) => ({
        id: `att-tech-${Date.now()}-${i}`,
        otm_id: otmId,
        uploaded_by: user!.id,
        file_url: p.file_url,
        file_name: p.file_name,
        file_type: 'other' as const,
        phase: 'execution' as const,
        created_at: new Date().toISOString(),
      }));

      return { 
        ...o, 
        technician_notes: notes, 
        status: 'awaiting_supervisor' as OTMStatus, 
        job_end_time: new Date().toISOString(), 
        attachments: [...(o.attachments || []), ...newAttachments],
        updated_at: new Date().toISOString() 
      };
    }));
  }, [user]);

  const approveWork = useCallback((otmId: string, notes?: string, start_time?: string, end_time?: string) => {
    setOTMs(prev => prev.map(o => {
      if (o.id !== otmId) return o;
      addLog(otmId, o.status, 'awaiting_conformity', 'Visto bueno del supervisor');
      return { 
        ...o, 
        status: 'awaiting_conformity' as OTMStatus, 
        technician_notes: notes !== undefined ? notes : o.technician_notes,
        job_start_time: start_time !== undefined ? start_time : o.job_start_time,
        job_end_time: end_time !== undefined ? end_time : o.job_end_time,
        updated_at: new Date().toISOString() 
      };
    }));
  }, [user]);

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
      createOTM, updateOTMStatus, assignOTM, assignSupervisor, assignContractor,
      createRQ, cancelOTM, updateOTMFields,
      startTechnicianWork, finishTechnicianWork, approveWork, submitConformity, refreshOTMs,
      users, supervisors, addUser, updateUser,
      areas, addArea, updateArea,
      specialties, addSpecialty, updateSpecialty,
      locations, addLocation, updateLocation,
      deleteUser, deleteArea, deleteSpecialty, deleteLocation
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
