import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode, useRef } from 'react';
import { OTMRequest, OTMStatusLog, OTMStatus, Profile, AssignmentType, RQType, RQMagnitude, CancellationReason, OTIRequest, OTI_SPECIALTY_ABBREVIATIONS, TechRequest, TechRequestStatus, OpexBudgetItem, CapexBudgetItem, PreventivePlanItem, OTMComment } from '../types';
import { DEMO_OTMS, DEMO_STATUS_LOGS, DEMO_USERS, generateOTMCode } from '../lib/demoData';
import { useAuth } from './AuthContext';
import { AREAS as INITIAL_AREAS, FAILURE_TYPES as INITIAL_FAILURES, LOCATIONS as INITIAL_LOCATIONS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_OPEX_BUDGET, MOCK_CAPEX_BUDGET } from '../lib/mockBudgetData';
import { MOCK_PREVENTIVE_PLAN } from '../lib/mockPreventiveData';

export function calculateNetTime(startTime: string | null, endTime: string | null, pauses: { paused_at: string; resumed_at: string | null }[] | null | undefined): number {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  let totalElapsed = end - start;

  let pausedMs = 0;
  if (pauses) {
    pauses.forEach(p => {
      const pStart = new Date(p.paused_at).getTime();
      const pEnd = p.resumed_at ? new Date(p.resumed_at).getTime() : end;
      if (pStart >= start && pStart <= end) {
        pausedMs += (pEnd - pStart);
      }
    });
  }

  const netMs = totalElapsed - pausedMs;
  return Math.max(0, Math.round(netMs / 60000)); // Round to nearest minute
}

interface OTMContextType {
  otms: OTMRequest[];
  statusLogs: OTMStatusLog[];
  getOTMsForCurrentUser: () => OTMRequest[];
  getOTMById: (id: string) => OTMRequest | undefined;
  createOTM: (data: Partial<OTMRequest>) => Promise<OTMRequest>;
  updateOTMStatus: (otmId: string, newStatus: OTMStatus, notes?: string) => void;
  assignOTM: (otmId: string, technicianIds: string[], scheduledDate: string, supervisorNotes?: string, estimatedTime?: number) => void;
  assignSupervisor: (otmId: string, supervisorId: string) => void;
  assignContractor: (otmId: string, name: string, date: string, detail: string) => void;
  createRQ: (otmId: string, rqType: 'supply' | 'service', data: { materials?: string; quantities?: string; serviceDesc?: string; magnitude?: 'puntual' | 'integral' }) => void;
  cancelOTM: (otmId: string, reason: string, detail?: string) => void;
  updateOTMFields: (otmId: string, fields: Partial<OTMRequest>) => void;
  startTechnicianWork: (otmId: string) => void;
  pauseTechnicianWork: (otmId: string) => void;
  resumeTechnicianWork: (otmId: string) => void;
  finishTechnicianWork: (otmId: string, notes: string, photos: { file_url: string, file_name: string }[], supplies_used?: import('../types').SupplyUsed[]) => void;
  registerManualExecution: (otmId: string, data: { job_start_time: string; job_end_time: string; technician_notes: string; supplies_used: import('../types').SupplyUsed[]; photos: { file_url: string; file_name: string }[] }) => void;
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
  
  // OTI state and methods
  otis: OTIRequest[];
  getOTIsForCurrentUser: () => OTIRequest[];
  createOTI: (otiData: Partial<OTIRequest>) => Promise<OTIRequest>;
  updateOTIStatus: (otiId: string, newStatus: OTIRequest['status']) => void;

  // TechRequest state and methods
  techRequests: TechRequest[];
  getTechRequestsForCurrentUser: () => TechRequest[];
  createTechRequest: (reqData: Partial<TechRequest>) => Promise<TechRequest>;
  updateTechRequestStatus: (id: string, status: TechRequestStatus, response?: string) => void;

  // Budget and Preventive state and methods
  opexBudget: OpexBudgetItem[];
  capexBudget: CapexBudgetItem[];
  preventivePlan: PreventivePlanItem[];
  updatePreventivePlanItem: (id: string, fields: Partial<PreventivePlanItem>) => void;
  addPreventivePlanItem: (item: Partial<PreventivePlanItem>) => void;
  deletePreventivePlanItem: (id: string) => void;
  updateBudgetItem: (type: 'CAPEX' | 'OPEX', id: string, fields: any) => void;
  deriveOTM: (otmId: string, area: string, notes: string) => Promise<void>;
  respondToDerivation: (otmId: string, status: 'accepted' | 'rejected', notes: string) => Promise<void>;
  addOTMComment: (otmId: string, text: string) => Promise<void>;
  toasts: { id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; otmId?: string }[];
  removeToast: (id: string) => void;
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error', otmId?: string) => void;
  isOTMUnread: (otm: OTMRequest) => boolean;
  markAsRead: (otmId: string) => void;
}

const OTMContext = createContext<OTMContextType | null>(null);

function playNotificationSound() {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        const now = audioCtx.currentTime;
        playTone(587.33, now, 0.12);
        playTone(880, now + 0.10, 0.25);
      });
    } else {
      const now = audioCtx.currentTime;
      playTone(587.33, now, 0.12);
      playTone(880, now + 0.10, 0.25);
    }
  } catch (error) {
    console.warn('AudioContext failed to play:', error);
  }
}

export function OTMProvider({ children }: { children: ReactNode }) {
  const { user, updateCurrentUser } = useAuth();
  const isLive = isSupabaseConfigured();

  // Notification Toast states
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; otmId?: string }[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', otmId?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    playNotificationSound();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {
        console.warn('Vibration API blocked or not supported');
      }
    }

    setToasts(prev => [...prev, { id, title, message, type, otmId }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const isOTMUnread = useCallback((otm: OTMRequest): boolean => {
    if (!user) return false;
    const lastViewedStr = localStorage.getItem(`otm_viewed_${user.id}_${otm.id}`);
    if (!lastViewedStr) {
      if (user.role === 'supervisor' && otm.status === 'pending') return true;
      if (user.role === 'jefatura' && otm.status === 'derived' && otm.derived_to_area === user.area_sector && otm.derived_status === 'pending') return true;
      if (user.role === 'requester' && otm.status === 'awaiting_conformity' && otm.area_sector === user.area_sector) return true;
      return false;
    }
    const lastViewed = new Date(lastViewedStr);
    const otmUpdated = new Date(otm.updated_at);
    if (otmUpdated > lastViewed) return true;

    if (otm.comments && otm.comments.length > 0) {
      const lastComment = new Date(otm.comments[otm.comments.length - 1].created_at);
      if (lastComment > lastViewed) return true;
    }
    return false;
  }, [user]);

  const markAsRead = useCallback((otmId: string) => {
    if (!user) return;
    localStorage.setItem(`otm_viewed_${user.id}_${otmId}`, new Date().toISOString());
    setOTMs(prev => [...prev]);
  }, [user]);

  const [otms, setOTMs] = useState<OTMRequest[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_otms_v3');
    return saved ? JSON.parse(saved) : [...DEMO_OTMS];
  });
  const [statusLogs, setLogs] = useState<OTMStatusLog[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_status_logs_v3');
    return saved ? JSON.parse(saved) : [...DEMO_STATUS_LOGS];
  });
  const [users, setUsers] = useState<Profile[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_users');
    return saved ? JSON.parse(saved) : [...DEMO_USERS];
  });
  const [areas, setAreas] = useState<string[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_areas');
    return saved ? JSON.parse(saved) : [...INITIAL_AREAS];
  });
  const [specialties, setSpecialties] = useState<string[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_specialties');
    return saved ? JSON.parse(saved) : [...INITIAL_FAILURES];
  });
  const [locations, setLocations] = useState<string[]>(() => {
    if (isLive) return [];
    const saved = localStorage.getItem('demo_locations');
    return saved ? JSON.parse(saved) : [...INITIAL_LOCATIONS];
  });
  const [otis, setOTIs] = useState<OTIRequest[]>(() => {
    const saved = localStorage.getItem('demo_otis');
    return saved ? JSON.parse(saved) : [];
  });
  const [techRequests, setTechRequests] = useState<TechRequest[]>(() => {
    const saved = localStorage.getItem('demo_tech_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [opexBudget, setOpexBudget] = useState<OpexBudgetItem[]>(() => {
    const saved = localStorage.getItem('demo_opex_budget');
    if (saved) return JSON.parse(saved);
    return MOCK_OPEX_BUDGET.map((item, idx) => ({ ...item, id: item.id || `opex-${idx}` }));
  });

  const [capexBudget, setCapexBudget] = useState<CapexBudgetItem[]>(() => {
    const saved = localStorage.getItem('demo_capex_budget');
    if (saved) return JSON.parse(saved);
    return MOCK_CAPEX_BUDGET.map((item, idx) => ({ ...item, id: item.id || `capex-${idx}` }));
  });

  const [preventivePlan, setPreventivePlan] = useState<PreventivePlanItem[]>(() => {
    const saved = localStorage.getItem('demo_preventive_plan');
    if (saved) return JSON.parse(saved);
    return [...MOCK_PREVENTIVE_PLAN];
  });

  // Diffing ref to monitor and trigger alerts for new/updated OTMs
  const prevOtmsRef = useRef<OTMRequest[]>([]);

  useEffect(() => {
    if (prevOtmsRef.current.length === 0) {
      prevOtmsRef.current = otms;
      return;
    }

    const prevOtms = prevOtmsRef.current;
    prevOtmsRef.current = otms;

    if (!user) return;

    otms.forEach(newOtm => {
      const oldOtm = prevOtms.find(o => o.id === newOtm.id);
      
      if (!oldOtm) {
        if ((user.role === 'supervisor' || user.role === 'admin') && newOtm.status === 'pending') {
          addToast(
            '🆕 Nueva Solicitud',
            `OTM ${newOtm.otm_code} creada por ${newOtm.requester_name} en ${newOtm.location || 'Sede Principal'}.`,
            'info',
            newOtm.id
          );
        }
        else if (user.role === 'jefatura' && newOtm.status === 'derived' && newOtm.derived_to_area === user.area_sector && newOtm.derived_status === 'pending') {
          addToast(
            '📥 OTM Derivada',
            `OTM ${newOtm.otm_code} ha sido derivada a tu área (${newOtm.derived_to_area}).`,
            'warning',
            newOtm.id
          );
        }
      } else {
        if (oldOtm.status !== newOtm.status) {
          if (user.role === 'requester' && newOtm.area_sector === user.area_sector && newOtm.requester_id === user.id) {
            const statusLabels: Record<string, string> = {
              scheduled: 'Programada',
              in_progress: 'En Ejecución',
              rq: 'Con Requerimiento',
              awaiting_conformity: 'Espera Conformidad',
              closed: 'Cerrada',
              cancelled: 'Cancelada'
            };
            const label = statusLabels[newOtm.status] || newOtm.status;
            addToast(
              '🔄 Actualización de OTM',
              `Tu OTM ${newOtm.otm_code} cambió al estado: ${label}.`,
              newOtm.status === 'awaiting_conformity' ? 'success' : 'info',
              newOtm.id
            );
          }
          else if (user.role === 'technician' && newOtm.technician_id === user.id && newOtm.status === 'scheduled') {
            addToast(
              '📅 Nueva Asignación',
              `Se te asignó la OTM ${newOtm.otm_code} para programar en agenda.`,
              'info',
              newOtm.id
            );
          }
          else if (user.role === 'jefatura' && newOtm.status === 'derived' && newOtm.derived_to_area === user.area_sector && newOtm.derived_status === 'pending' && oldOtm.status !== 'derived') {
            addToast(
              '📥 OTM Derivada',
              `OTM ${newOtm.otm_code} derivada a tu área (${newOtm.derived_to_area}).`,
              'warning',
              newOtm.id
            );
          }
          else if (user.role === 'supervisor' || user.role === 'admin') {
            if (newOtm.status === 'awaiting_supervisor') {
              addToast(
                '👷 Aprobación Requerida',
                `OTM ${newOtm.otm_code} finalizada por el técnico y requiere aprobación.`,
                'success',
                newOtm.id
              );
            } else if (newOtm.status === 'pending' && oldOtm.status === 'derived' && newOtm.derived_status === 'rejected') {
              addToast(
                '❌ Derivación Rechazada',
                `OTM ${newOtm.otm_code} rechazada por ${newOtm.derived_to_area}. Volvió a pendientes.`,
                'error',
                newOtm.id
              );
            }
          }
        }

        const oldCommentsLen = oldOtm.comments?.length || 0;
        const newCommentsLen = newOtm.comments?.length || 0;
        if (newCommentsLen > oldCommentsLen && newOtm.comments) {
          const newComment = newOtm.comments[newOtm.comments.length - 1];
          if (newComment.user_id !== user.id) {
            const isRelevant = 
              (user.role === 'requester' && newOtm.requester_id === user.id) ||
              (user.role === 'technician' && newOtm.technician_id === user.id) ||
              (user.role === 'supervisor' && (newOtm.supervisor_id === user.id || !newOtm.supervisor_id)) ||
              (user.role === 'jefatura' && newOtm.derived_to_area === user.area_sector && newOtm.status === 'derived') ||
              (user.role === 'admin');

            if (isRelevant) {
              addToast(
                '💬 Nuevo Mensaje',
                `Mensaje de ${newComment.user_name} en OTM ${newOtm.otm_code}: "${newComment.text.substring(0, 40)}${newComment.text.length > 40 ? '...' : ''}"`,
                'info',
                newOtm.id
              );
            }
          }
        }
      }
    });

  }, [otms, user, addToast]);


  // ── Demo persistence effects ──
  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_otms_v3', JSON.stringify(otms));
  }, [otms, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_status_logs_v3', JSON.stringify(statusLogs));
  }, [statusLogs, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_users', JSON.stringify(users));
  }, [users, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_areas', JSON.stringify(areas));
  }, [areas, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_specialties', JSON.stringify(specialties));
  }, [specialties, isLive]);

  useEffect(() => {
    if (!isLive) localStorage.setItem('demo_locations', JSON.stringify(locations));
  }, [locations, isLive]);

  useEffect(() => {
    localStorage.setItem('demo_otis', JSON.stringify(otis));
  }, [otis]);

  useEffect(() => {
    localStorage.setItem('demo_tech_requests', JSON.stringify(techRequests));
  }, [techRequests]);

  useEffect(() => {
    localStorage.setItem('demo_opex_budget', JSON.stringify(opexBudget));
  }, [opexBudget]);

  useEffect(() => {
    localStorage.setItem('demo_capex_budget', JSON.stringify(capexBudget));
  }, [capexBudget]);

  useEffect(() => {
    localStorage.setItem('demo_preventive_plan', JSON.stringify(preventivePlan));
  }, [preventivePlan]);

  // ── Supabase: Load initial data ──
  const fetchAll = useCallback(async () => {
    if (!isLive) return;
    const [otmRes, logRes, userRes, masterRes] = await Promise.all([
      supabase.from('otm_requests').select('*, assigned_technicians:otm_technicians(technician_id, technician:profiles(*)), comments:otm_comments(*)').order('created_at', { ascending: false }),
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
      const { data } = await supabase
        .from('otm_requests')
        .update(fields)
        .eq('id', otmId)
        .select('*, assigned_technicians:otm_technicians(technician_id, technician:profiles(*)), comments:otm_comments(*)')
        .single();
      if (data) {
        setOTMs(prev => prev.map(o => o.id === otmId ? { ...o, ...data } : o));
      }
    } else {
      setOTMs(prev => prev.map(o => o.id !== otmId ? o : { ...o, ...fields, updated_at: new Date().toISOString() }));
    }
  };

  // ── CRUD: OTMs ──
  const getOTMsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'requester') {
      return otms.filter(o => o.requester_id === user.id || o.area_sector === user.area_sector);
    }
    if (user.role === 'jefatura' && user.area_sector !== '22. MANTENIMIENTO') {
      return otms.filter(o => o.requester_id === user.id || o.area_sector === user.area_sector);
    }
    if (user.role === 'technician') return otms.filter(o => 
      o.technician_id === user.id || 
      (o.assigned_technicians && o.assigned_technicians.some(t => t.technician_id === user.id))
    );
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

  const assignOTM = useCallback(async (otmId: string, technicianIds: string[], scheduledDate: string, supervisorNotes?: string, estimatedTime?: number) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;

    // Usar el primer técnico de la lista para la columna legada technician_id por compatibilidad
    const primaryTechId = technicianIds[0] || null;

    const fields: Partial<OTMRequest> = {
      technician_id: primaryTechId,
      scheduled_date: scheduledDate,
      supervisor_id: otm.supervisor_id || user!.id,
      supervisor_notes: supervisorNotes || otm.supervisor_notes,
      assignment_type: 'own' as AssignmentType,
      status: 'scheduled' as OTMStatus,
      estimated_time: estimatedTime || null,
    };

    if (isLive) {
      const { data: updatedOtm, error: otmError } = await supabase
        .from('otm_requests')
        .update(fields)
        .eq('id', otmId)
        .select()
        .single();

      if (otmError) {
        console.error("Error al actualizar OTM:", otmError);
        return;
      }

      // Eliminar asignaciones previas e insertar las nuevas en la tabla intermedia
      await supabase.from('otm_technicians').delete().eq('otm_id', otmId);

      if (technicianIds.length > 0) {
        const rows = technicianIds.map(techId => ({
          otm_id: otmId,
          technician_id: techId,
        }));
        await supabase.from('otm_technicians').insert(rows);
      }

      // Obtener los datos completos de los técnicos asignados con sus perfiles
      const { data: relations } = await supabase
        .from('otm_technicians')
        .select('technician_id, technician:profiles(*)')
        .eq('otm_id', otmId);

      const finalOtm = {
        ...updatedOtm,
        assigned_technicians: relations || [],
      };

      setOTMs(prev => prev.map(o => o.id === otmId ? finalOtm : o));
    } else {
      // Modo Demo
      const mappedAssigned = technicianIds.map(techId => {
        const profile = users.find(u => u.id === techId);
        return {
          technician_id: techId,
          technician: profile,
        };
      });

      setOTMs(prev => prev.map(o => o.id !== otmId ? o : {
        ...o,
        ...fields,
        assigned_technicians: mappedAssigned,
        updated_at: new Date().toISOString()
      }));
    }

    addLog(otmId, otm.status, 'scheduled', `Asignado (Personal Propio: ${technicianIds.length} técnicos). Est. ${estimatedTime || 0} min. ${supervisorNotes || ''}`);
  }, [otms, user, isLive, users]);

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
    patchOTM(otmId, {
      status: 'in_progress' as OTMStatus,
      job_start_time: new Date().toISOString(),
      net_execution_time: 0,
      pauses: []
    });
    addLog(otmId, otm.status, 'in_progress', 'Técnico inició el trabajo');
  }, [otms, user, isLive]);

  const pauseTechnicianWork = useCallback((otmId: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    const currentPauses = otm.pauses || [];
    const newPause = { paused_at: new Date().toISOString(), resumed_at: null };
    patchOTM(otmId, {
      pauses: [...currentPauses, newPause]
    });
    addLog(otmId, otm.status, otm.status, 'Técnico pospuso el trabajo (En Pausa)');
  }, [otms, isLive, user]);

  const resumeTechnicianWork = useCallback((otmId: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm) return;
    const currentPauses = otm.pauses || [];
    const updatedPauses = currentPauses.map((p, idx) => {
      if (idx === currentPauses.length - 1 && p.resumed_at === null) {
        return { ...p, resumed_at: new Date().toISOString() };
      }
      return p;
    });
    patchOTM(otmId, {
      pauses: updatedPauses
    });
    addLog(otmId, otm.status, otm.status, 'Técnico retomó el trabajo (En Ejecución)');
  }, [otms, isLive, user]);

  const finishTechnicianWork = useCallback(async (otmId: string, notes: string, photos: { file_url: string, file_name: string }[], supplies_used?: import('../types').SupplyUsed[]) => {
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
    
    const endTime = new Date().toISOString();
    const netTime = calculateNetTime(otm.job_start_time, endTime, otm.pauses);

    const fields: any = {
      technician_notes: notes,
      status: 'awaiting_supervisor' as OTMStatus,
      job_end_time: endTime,
      net_execution_time: netTime
    };

    if (supplies_used && supplies_used.length > 0) {
      fields.supplies_used = supplies_used;
    }

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

  const registerManualExecution = useCallback(async (otmId: string, data: { job_start_time: string; job_end_time: string; technician_notes: string; supplies_used: import('../types').SupplyUsed[]; photos: { file_url: string; file_name: string }[] }) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm || !user) return;

    if (isLive && data.photos.length > 0) {
      const atts = data.photos.map(p => ({
        otm_id: otmId, uploaded_by: user.id,
        file_url: p.file_url, file_name: p.file_name,
        file_type: 'other', phase: 'execution',
      }));
      await supabase.from('otm_attachments').insert(atts);
    }

    const netTime = calculateNetTime(data.job_start_time, data.job_end_time, []);
    // Si es supervisor y la está registrando él mismo, que pase a awaiting_conformity
    const nextStatus: OTMStatus = (user.role === 'supervisor' || user.role === 'admin') ? 'awaiting_conformity' : 'awaiting_supervisor';

    const fields: any = {
      technician_notes: data.technician_notes,
      status: nextStatus,
      job_start_time: data.job_start_time,
      job_end_time: data.job_end_time,
      net_execution_time: netTime
    };

    if (data.supplies_used && data.supplies_used.length > 0) {
      fields.supplies_used = data.supplies_used;
    }

    if (!isLive) {
      const newAttachments = data.photos.map((p, i) => ({
        id: `att-tech-${Date.now()}-${i}`, otm_id: otmId, uploaded_by: user.id,
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

    const logMessage = user.role === 'supervisor' || user.role === 'admin' 
      ? 'Regularización: Trabajo registrado y validado por supervisor'
      : 'Regularización: Trabajo registrado manualmente por técnico';
      
    addLog(otmId, otm.status, nextStatus, logMessage);
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

  const getOTIsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'technician') {
      return otis.filter(o => o.technician_ids && o.technician_ids.includes(user.id));
    }
    return otis;
  }, [otis, user]);

  const createOTI = useCallback(async (otiData: Partial<OTIRequest>): Promise<OTIRequest> => {
    const specialty = otiData.specialty || 'Otros';
    const abbr = OTI_SPECIALTY_ABBREVIATIONS[specialty] || 'OTRO';
    const specialtyOtis = otis.filter(o => o.specialty === specialty);
    const sequence = specialtyOtis.length + 1;
    const nn = String(sequence).padStart(4, '0');
    const otiCode = `OTI-${abbr}-${nn}`;

    const newOTI: OTIRequest = {
      id: `oti-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      oti_code: otiCode,
      supervisor_id: user!.id,
      supervisor_name: user!.full_name,
      location: otiData.location || '',
      exact_location: otiData.exact_location || null,
      description: otiData.description || '',
      specialty: specialty,
      scheduled_date: otiData.scheduled_date || new Date().toISOString(),
      estimated_time: otiData.estimated_time !== undefined ? otiData.estimated_time : null,
      status: 'scheduled',
      technician_ids: otiData.technician_ids || [],
      image_url: otiData.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setOTIs(prev => [newOTI, ...prev]);
    return newOTI;
  }, [user, otis]);

  const updateOTIStatus = useCallback((otiId: string, newStatus: OTIRequest['status']) => {
    setOTIs(prev => prev.map(o => o.id !== otiId ? o : {
      ...o,
      status: newStatus,
      updated_at: new Date().toISOString()
    }));
  }, []);

  const getTechRequestsForCurrentUser = useCallback(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'supervisor') return techRequests;
    return techRequests.filter(r => r.technician_id === user.id);
  }, [techRequests, user]);

  const createTechRequest = useCallback(async (reqData: Partial<TechRequest>) => {
    if (!user) throw new Error('Not authenticated');
    const newRequest: TechRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      technician_id: user.id,
      technician_name: user.full_name,
      specialty: user.position || 'General',
      request_type: reqData.request_type || 'other',
      otm_id: reqData.otm_id || null,
      otm_code: reqData.otm_code || null,
      description: reqData.description || '',
      status: 'pending',
      supervisor_response: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTechRequests(prev => [newRequest, ...prev]);
    return newRequest;
  }, [user]);

  const updateTechRequestStatus = useCallback((id: string, status: TechRequestStatus, response?: string) => {
    setTechRequests(prev => prev.map(r => r.id !== id ? r : {
      ...r,
      status,
      supervisor_response: response || null,
      updated_at: new Date().toISOString()
    }));
  }, []);

  const updatePreventivePlanItem = useCallback((id: string, fields: Partial<PreventivePlanItem>) => {
    setPreventivePlan(prev => prev.map(item => item.id !== id ? item : { ...item, ...fields }));
  }, []);

  const addPreventivePlanItem = useCallback((item: Partial<PreventivePlanItem>) => {
    const newItem: PreventivePlanItem = {
      id: `pm-${Date.now()}`,
      num: preventivePlan.length + 1,
      prio: item.prio || 'MEDIO',
      actividad: item.actividad || '',
      ubicacion: item.ubicacion || '',
      frecuencia: item.frecuencia || '',
      presupuesto_proyectado: item.presupuesto_proyectado || 0,
      responsable: item.responsable || '',
      fecha_tdr_revision: item.fecha_tdr_revision || '',
      fecha_tdr_envio: item.fecha_tdr_envio || '',
      rq: item.rq || '',
      acuerdo: item.acuerdo || '',
      proveedor: item.proveedor || '',
      monto_sin_igv: item.monto_sin_igv || 0,
      estado_original: item.estado_original || 'PLANIFICADO',
      active_weeks: item.active_weeks || [],
      assigned_staff_id: item.assigned_staff_id || null,
      assigned_contractor: item.assigned_contractor,
      status: item.status || 'Pendiente',
      budgetItemLinkId: item.budgetItemLinkId,
      budgetItemLinkType: item.budgetItemLinkType,
      completed_weeks: item.completed_weeks || []
    };
    setPreventivePlan(prev => [...prev, newItem]);
  }, [preventivePlan]);

  const deletePreventivePlanItem = useCallback((id: string) => {
    setPreventivePlan(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateBudgetItem = useCallback((type: 'CAPEX' | 'OPEX', id: string, fields: any) => {
    if (type === 'OPEX') {
      setOpexBudget(prev => prev.map(item => item.id !== id ? item : { ...item, ...fields }));
    } else {
      setCapexBudget(prev => prev.map(item => item.id !== id ? item : { ...item, ...fields }));
    }
  }, []);

  const deriveOTM = useCallback(async (otmId: string, area: string, notes: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm || !user) return;

    const jefaturas = users
      .filter(u => u.role === 'jefatura' && u.area_sector === area)
      .map(u => u.full_name)
      .join(', ') || 'Jefatura de Área';

    const fields = {
      status: 'derived' as OTMStatus,
      derived_to_area: area,
      derived_notes: notes,
      derived_to_jefatura_name: jefaturas,
      derived_at: new Date().toISOString(),
      derived_status: 'pending' as 'pending' | 'accepted' | 'rejected',
      derived_response_notes: null,
      derived_response_at: null,
    };

    await patchOTM(otmId, fields);
    await addLog(otmId, otm.status, 'derived', `Derivado al área ${area} (Jefatura: ${jefaturas}) — Nota: ${notes}`);
  }, [otms, users, user, patchOTM]);

  const respondToDerivation = useCallback(async (otmId: string, status: 'accepted' | 'rejected', notes: string) => {
    const otm = otms.find(o => o.id === otmId);
    if (!otm || !user) return;

    const fields = {
      derived_status: status,
      derived_response_notes: notes,
      derived_response_at: new Date().toISOString(),
      status: (status === 'rejected' ? 'pending' : 'derived') as OTMStatus,
    };

    await patchOTM(otmId, fields);
    await addLog(otmId, otm.status, fields.status, `Derivación ${status === 'accepted' ? 'ACEPTADA' : 'RECHAZADA'} por ${user.full_name}. Nota: ${notes}`);
  }, [otms, user, patchOTM]);

  const addOTMComment = useCallback(async (otmId: string, text: string) => {
    if (!user) return;
    const newComment: OTMComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      otm_id: otmId,
      user_id: user.id,
      user_name: user.full_name,
      user_role: user.role,
      text: text,
      created_at: new Date().toISOString(),
    };

    if (isLive) {
      try {
        const { data } = await supabase
          .from('otm_comments')
          .insert(newComment)
          .select()
          .single();
        if (data) {
          setOTMs(prev => prev.map(o => o.id === otmId ? { ...o, comments: [...(o.comments || []), data] } : o));
        }
      } catch (err) {
        console.error('Error inserting comment to Supabase, falling back to local state:', err);
        setOTMs(prev => prev.map(o => o.id === otmId ? { ...o, comments: [...(o.comments || []), newComment] } : o));
      }
    } else {
      setOTMs(prev => prev.map(o => o.id === otmId ? { ...o, comments: [...(o.comments || []), newComment] } : o));
    }
  }, [user, isLive]);

  return (
    <OTMContext.Provider value={{
      otms, statusLogs, getOTMsForCurrentUser, getOTMById,
      createOTM, updateOTMStatus, assignOTM, assignSupervisor, assignContractor,
      createRQ, cancelOTM, updateOTMFields,
      startTechnicianWork, pauseTechnicianWork, resumeTechnicianWork, finishTechnicianWork, registerManualExecution, approveWork, submitConformity, refreshOTMs,
      users, supervisors, addUser, updateUser,
      areas, addArea, updateArea,
      specialties, addSpecialty, updateSpecialty,
      locations, addLocation, updateLocation,
      deleteUser, deleteArea, deleteSpecialty, deleteLocation,
      otis, getOTIsForCurrentUser, createOTI, updateOTIStatus,
      techRequests, getTechRequestsForCurrentUser, createTechRequest, updateTechRequestStatus,
      opexBudget, capexBudget, preventivePlan,
      updatePreventivePlanItem, addPreventivePlanItem, deletePreventivePlanItem, updateBudgetItem,
      deriveOTM, respondToDerivation, addOTMComment,
      toasts, removeToast, addToast, isOTMUnread, markAsRead
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
