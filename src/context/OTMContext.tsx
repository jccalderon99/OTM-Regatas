import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { OTMRequest, OTMStatusLog, OTMStatus, Profile, AssignmentType, RQType, RQMagnitude, CancellationReason } from '../types';
import { DEMO_OTMS, DEMO_STATUS_LOGS, DEMO_USERS, generateOTMCode } from '../lib/demoData';
import { useAuth } from './AuthContext';
import { AREAS as INITIAL_AREAS, FAILURE_TYPES as INITIAL_FAILURES, LOCATIONS as INITIAL_LOCATIONS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface OTMContextType {
  otms: OTMRequest[];
  statusLogs: OTMStatusLog[];
  getOTMsForCurrentUser: () => OTMRequest[];
  getOTMById: (id: string) => OTMRequest | undefined;
  createOTM: (data: Partial<OTMRequest>) => Promise<OTMRequest>;
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
  const { user, updateCurrentUser } = useAuth();
  const isLive = isSupabaseConfigured();

  const [otms, setOTMs] = useState<OTMRequest[]>(isLive ? [] : [...DEMO_OTMS]);
  const [statusLogs, setLogs] = useState<OTMStatusLog[]>(isLive ? [] : [...DEMO_STATUS_LOGS]);
  const [users, setUsers] = useState<Profile[]>(isLive ? [] : [...DEMO_USERS]);
  const [areas, setAreas] = useState<string[]>(isLive ? [] : [...INITIAL_AREAS]);
  const [specialties, setSpecialties] = useState<string[]>(isLive ? [] : [...INITIAL_FAILURES]);
  const [locations, setLocations] = useState<string[]>(isLive ? [] : [...INITIAL_LOCATIONS]);

  // ── Supabase: Load initial data ──
  const fetchAll = useCallback(async () => {
    if (!isLive) return;
    const [otmRes, logRes, userRes, masterRes] = await Promise.all([
      supabase.from('otm_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('otm_status_logs').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('master_data').select('*').eq('active', true).order('sort_order'),
    ]);
    if (otmRes.data) setOTMs(otmRes.data);
    if (logRes.data) setLogs(logRes.data);
    if (userRes.data) setUsers(userRes.data);
    if (masterRes.data) {
      setAreas(masterRes.data.filter((m: any) => m.type === 'area').map((m: any) => m.name));
      setSpecialties(masterRes.data.filter((m: any) => m.type === 'specialty').map((m: any) => m.name));
      setLocations(masterRes.data.filter((m: any) => m.type === 'location').map((m: any) => m.name));
    }
  }, [isLive]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const supervisors = useMemo(() => users.filter(u => u.role === 'supervisor'), [users]);

  // ── Helper: insert status log ──
  const addLog = async (otmId: string, prevStatus: string | null, newStatus: string, notes?: string) => {
    if (!user) return;
    const log: OTMStatusLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      otm_id: otmId, previous_status: prevStatus,
      new_status: newStatus, changed_by: user.id, notes: notes || null,
      created_at: new Date().toISOString(),
    };
    if (isLive) {
      const { data } = await supabase.from('otm_status_logs').insert({
        otm_id: otmId, previous_status: prevStatus,
        new_status: newStatus, changed_by: user.id, notes: notes || null,
      }).select().single();
      if (data) setLogs(prev => [...prev, data]);
    } else {
      setLogs(prev => [...prev, log]);
    }
  };

  // ── Helper: update OTM in Supabase + local state ──
  const patchOTM = async (otmId: string, fields: Partial<OTMRequest>) => {
    if (isLive) {
      const { data } = await supabase.from('otm_requests').update(fields).eq('id', otmId).select().single();
      if (data) setOTMs(prev => prev.map(o => o.id === otmId ? data : o));
    } else {
      setOTMs(prev => prev.map(o => o.id !== otmId ? o : { ...o, ...fields, updated_at: new Date().toISOString() }));
    }
  };

  // ── CRUD: OTMs ──
  const getOTMsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'requester') return otms.filter(o => o.requester_id === user.id || o.area_sector === user.area_sector);
    if (user.role === 'technician') return otms.filter(o => o.technician_id === user.id);
    return otms;
  }, [otms, user]);

  const getOTMById = useCallback((id: string) => otms.find(o => o.id === id), [otms]);

  const createOTM = useCallback(async (data: Partial<OTMRequest>): Promise<OTMRequest> => {
    const finalArea = data.area_sector || user!.area_sector || '';
    const finalSpecialty = data.failure_type || '';
    if (isLive) {
      const { data: inserted, error } = await supabase.from('otm_requests').insert({
        otm_code: generateOTMCode(finalArea, finalSpecialty, otms.length + 1),
        requester_id: user!.id, requester_name: user!.full_name,
        area_sector: finalArea, exact_location: data.exact_location || null,
        failure_type: finalSpecialty, asset: data.asset || null,
        description: data.description || '', urgency: data.urgency || 'medium',
        location: data.location || null, status: 'pending',
      }).select().single();
      if (error) throw error;
      setOTMs(prev => [inserted, ...prev]);
      await addLog(inserted.id, null, 'pending', 'Solicitud creada');
      // Insert attachments if any
      if (data.attachments && data.attachments.length > 0) {
        const atts = data.attachments.map(a => ({
          otm_id: inserted.id, uploaded_by: user!.id,
          file_url: a.file_url, file_name: a.file_name,
          file_type: a.file_type || 'other', phase: a.phase || 'request',
        }));
        await supabase.from('otm_attachments').insert(atts);
      }
      return inserted;
    } else {
      // Demo mode (unchanged)
      const newOTM: OTMRequest = {
        id: `otm-${Date.now()}`, otm_code: generateOTMCode(finalArea, finalSpecialty, otms.length + 1),
        requester_id: user!.id, requester_name: user!.full_name,
        area_sector: finalArea, exact_location: data.exact_location || null,
        failure_type: finalSpecialty, asset: data.asset || null,
        description: data.description || '', urgency: data.urgency || 'medium',
        location: data.location || null,
        supervisor_id: null, supervisor_notes: null, scheduled_date: null,
        technician_id: null, technician_notes: null, status: 'pending',
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
    }
  }, [user, otms, isLive]);

  const updateOTMStatus = useCallback((otmId: string, newStatus: OTMStatus, notes?: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    const fields: any = { status: newStatus };
    if (newStatus === 'closed') fields.closed_at = new Date().toISOString();
    patchOTM(otmId, fields);
    addLog(otmId, otm.status, newStatus, notes);
  }, [otms, isLive, user]);

  const assignSupervisor = useCallback((otmId: string, supervisorId: string) => {
    patchOTM(otmId, { supervisor_id: supervisorId });
  }, [isLive]);

  const assignOTM = useCallback((otmId: string, technicianId: string, scheduledDate: string, supervisorNotes?: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    patchOTM(otmId, {
      technician_id: technicianId, scheduled_date: scheduledDate,
      supervisor_id: otm.supervisor_id || user!.id,
      supervisor_notes: supervisorNotes || otm.supervisor_notes,
      assignment_type: 'own' as AssignmentType, status: 'scheduled' as OTMStatus,
    });
    addLog(otmId, otm.status, 'scheduled', `Asignado (Personal Propio). ${supervisorNotes || ''}`);
  }, [otms, user, isLive]);

  const assignContractor = useCallback((otmId: string, name: string, date: string, detail: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    patchOTM(otmId, {
      assignment_type: 'contractor' as AssignmentType,
      contractor_name: name, contractor_date: date, contractor_detail: detail,
      supervisor_id: otm.supervisor_id || user!.id, status: 'scheduled' as OTMStatus,
    });
    addLog(otmId, otm.status, 'scheduled', `Asignado (Tercero: ${name})`);
  }, [otms, user, isLive]);

  const createRQ = useCallback((otmId: string, rqType: 'supply' | 'service', data: { materials?: string; quantities?: string; serviceDesc?: string; magnitude?: 'puntual' | 'integral' }) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    const label = rqType === 'supply' ? 'RQ Suministro' : 'RQ Servicio';
    patchOTM(otmId, {
      rq_type: rqType as RQType, rq_date: new Date().toISOString(),
      rq_materials: data.materials || null, rq_quantities: data.quantities || null,
      rq_service_desc: data.serviceDesc || null, rq_magnitude: (data.magnitude || null) as RQMagnitude,
      status: 'rq' as OTMStatus,
    });
    addLog(otmId, otm.status, 'rq', `${label} registrado`);
  }, [otms, user, isLive]);

  const cancelOTM = useCallback((otmId: string, reason: string, detail?: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    patchOTM(otmId, {
      status: 'cancelled' as OTMStatus,
      cancellation_reason: reason as CancellationReason,
      cancellation_detail: detail || null,
    });
    addLog(otmId, otm.status, 'cancelled', `Cancelado: ${reason}${detail ? ' — ' + detail : ''}`);
  }, [otms, user, isLive]);

  const updateOTMFields = useCallback((otmId: string, fields: Partial<OTMRequest>) => {
    patchOTM(otmId, fields);
  }, [isLive]);

  const startTechnicianWork = useCallback((otmId: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    patchOTM(otmId, { status: 'in_progress' as OTMStatus, job_start_time: new Date().toISOString() });
    addLog(otmId, otm.status, 'in_progress', 'Técnico inició el trabajo');
  }, [otms, user, isLive]);

  const finishTechnicianWork = useCallback(async (otmId: string, notes: string, photos: { file_url: string, file_name: string }[]) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    if (isLive && photos.length > 0) {
      const atts = photos.map(p => ({
        otm_id: otmId, uploaded_by: user!.id,
        file_url: p.file_url, file_name: p.file_name,
        file_type: 'other', phase: 'execution',
      }));
      await supabase.from('otm_attachments').insert(atts);
    }
    const fields: any = {
      technician_notes: notes, status: 'awaiting_supervisor' as OTMStatus,
      job_end_time: new Date().toISOString(),
    };
    if (!isLive) {
      const newAttachments = photos.map((p, i) => ({
        id: `att-tech-${Date.now()}-${i}`, otm_id: otmId, uploaded_by: user!.id,
        file_url: p.file_url, file_name: p.file_name,
        file_type: 'other' as const, phase: 'execution' as const,
        created_at: new Date().toISOString(),
      }));
      setOTMs(prev => prev.map(o => o.id !== otmId ? o : {
        ...o, ...fields, attachments: [...(o.attachments || []), ...newAttachments],
        updated_at: new Date().toISOString(),
      }));
    } else {
      patchOTM(otmId, fields);
    }
    addLog(otmId, otm.status, 'awaiting_supervisor', 'Trabajo finalizado por técnico, esperando visto bueno');
  }, [otms, user, isLive]);

  const approveWork = useCallback((otmId: string, notes?: string, start_time?: string, end_time?: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    const fields: any = { status: 'awaiting_conformity' as OTMStatus };
    if (notes !== undefined) fields.technician_notes = notes;
    if (start_time !== undefined) fields.job_start_time = start_time;
    if (end_time !== undefined) fields.job_end_time = end_time;
    patchOTM(otmId, fields);
    addLog(otmId, otm.status, 'awaiting_conformity', 'Visto bueno del supervisor');
  }, [otms, user, isLive]);

  const submitConformity = useCallback((otmId: string, rating: number, notes: string, signatureUrl: string | null = null) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    patchOTM(otmId, {
      status: 'closed' as OTMStatus, conformity_rating: rating,
      conformity_notes: notes, conformity_signature_url: signatureUrl,
      conformity_date: new Date().toISOString(), closed_at: new Date().toISOString(),
    });
    addLog(otmId, otm.status, 'closed', `Conformidad: ${rating}/5`);
  }, [otms, user, isLive]);

  // ── Master Data CRUD ──
  const addMaster = async (type: string, name: string) => {
    if (isLive) {
      await supabase.from('master_data').insert({ type, name, sort_order: 0 });
    }
  };
  const updateMaster = async (type: string, oldName: string, newName: string) => {
    if (isLive) {
      await supabase.from('master_data').update({ name: newName }).eq('type', type).eq('name', oldName);
    }
  };
  const deleteMaster = async (type: string, name: string) => {
    if (isLive) {
      await supabase.from('master_data').delete().eq('type', type).eq('name', name);
    }
  };

  const addArea = useCallback((a: string) => { setAreas(p => [...p, a]); addMaster('area', a); }, [isLive]);
  const updateArea = useCallback((o: string, n: string) => { setAreas(p => p.map(x => x === o ? n : x)); updateMaster('area', o, n); }, [isLive]);
  const deleteArea = useCallback((n: string) => { setAreas(p => p.filter(x => x !== n)); deleteMaster('area', n); }, [isLive]);

  const addSpecialty = useCallback((s: string) => { setSpecialties(p => [...p, s]); addMaster('specialty', s); }, [isLive]);
  const updateSpecialty = useCallback((o: string, n: string) => { setSpecialties(p => p.map(x => x === o ? n : x)); updateMaster('specialty', o, n); }, [isLive]);
  const deleteSpecialty = useCallback((n: string) => { setSpecialties(p => p.filter(x => x !== n)); deleteMaster('specialty', n); }, [isLive]);

  const addLocation = useCallback((l: string) => { setLocations(p => [...p, l]); addMaster('location', l); }, [isLive]);
  const updateLocation = useCallback((o: string, n: string) => { setLocations(p => p.map(x => x === o ? n : x)); updateMaster('location', o, n); }, [isLive]);
  const deleteLocation = useCallback((n: string) => { setLocations(p => p.filter(x => x !== n)); deleteMaster('location', n); }, [isLive]);

  // ── User CRUD ──
  const addUser = useCallback(async (newUser: Profile) => {
    if (isLive) {
      const { data } = await supabase.from('profiles').insert({
        full_name: newUser.full_name, email: newUser.email, role: newUser.role,
        area_sector: newUser.area_sector, position: newUser.position,
        jefatura_name: newUser.jefatura_name, jefatura_position: newUser.jefatura_position,
        jefatura_email: newUser.jefatura_email, phone: newUser.phone,
      }).select().single();
      if (data) setUsers(prev => [...prev, data]);
    } else {
      setUsers(prev => [...prev, newUser]);
    }
  }, [isLive]);

  const updateUser = useCallback(async (updated: Profile) => {
    if (isLive) {
      const { data } = await supabase.from('profiles').update({
        full_name: updated.full_name, email: updated.email, role: updated.role,
        area_sector: updated.area_sector, position: updated.position,
        jefatura_name: updated.jefatura_name, jefatura_position: updated.jefatura_position,
        jefatura_email: updated.jefatura_email,
      }).eq('id', updated.id).select().single();
      if (data) setUsers(prev => prev.map(u => u.id === updated.id ? data : u));
    } else {
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    }
    // Sync current logged-in user profile changes dynamically
    if (user && (user.id === updated.id || user.email.toLowerCase() === updated.email.toLowerCase())) {
      updateCurrentUser(updated);
    }
  }, [isLive, user, updateCurrentUser]);

  const deleteUser = useCallback(async (id: string) => {
    if (isLive) {
      await supabase.from('profiles').delete().eq('id', id);
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  }, [isLive]);

  const refreshOTMs = useCallback(() => { fetchAll(); }, [fetchAll]);

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
