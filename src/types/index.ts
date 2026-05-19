export type UserRole = 'requester' | 'supervisor' | 'technician' | 'jefatura' | 'admin';

export type OTMStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'rq'
  | 'awaiting_supervisor'
  | 'awaiting_conformity'
  | 'closed'
  | 'cancelled';

export type MaintenanceType = 'corrective' | 'preventive' | 'emergency' | 'support' | null;

export const MAINTENANCE_LABELS: Record<string, string> = {
  corrective: 'Correctivo',
  preventive: 'Preventivo',
  emergency: 'Emergencia',
  support: 'Soporte',
};

export type Urgency = 'low' | 'medium' | 'high';

export type AttachmentPhase = 'request' | 'execution' | 'conformity';
export type AttachmentType = 'before_photo' | 'after_photo' | 'document' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  area_sector: string | null;
  phone: string | null;
  avatar_url: string | null;
  // User Management extra fields
  position?: string;
  jefatura_name?: string;
  jefatura_position?: string;
  jefatura_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export type AssignmentType = 'own' | 'contractor' | null;
export type RQType = 'supply' | 'service' | null;
export type RQMagnitude = 'puntual' | 'integral' | null;
export type CancellationReason = 'not_maintenance' | 'wrong_request' | 'duplicate' | 'other' | null;

export const CANCELLATION_LABELS: Record<string, string> = {
  not_maintenance: 'No pertenece a mantenimiento',
  wrong_request: 'Solicitud errónea',
  duplicate: 'Solicitud duplicada',
  other: 'Otros',
};

export interface OTMRequest {
  id: string;
  otm_code: string;
  requester_id: string;
  requester_name: string;
  area_sector: string;
  exact_location: string | null;
  failure_type: string;
  asset: string | null;
  description: string;
  urgency: Urgency;
  location: string | null;
  supervisor_id: string | null;
  supervisor_notes: string | null;
  scheduled_date: string | null;
  technician_id: string | null;
  technician_notes: string | null;
  status: OTMStatus;
  maintenance_type: MaintenanceType;
  job_start_time: string | null;
  job_end_time: string | null;
  conformity_rating: number | null;
  conformity_notes: string | null;
  conformity_signature_url: string | null;
  conformity_date: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // Assignment type
  assignment_type: AssignmentType;
  // Contractor (Personal tercero)
  contractor_name: string | null;
  contractor_date: string | null;
  contractor_detail: string | null;
  // RQ (Requerimiento)
  rq_type: RQType;
  rq_date: string | null;
  rq_materials: string | null;
  rq_quantities: string | null;
  rq_service_desc: string | null;
  rq_magnitude: RQMagnitude;
  // Cancellation
  cancellation_reason: CancellationReason;
  cancellation_detail: string | null;
  // Joined data
  supervisor?: Profile;
  technician?: Profile;
  attachments?: OTMAttachment[];
  status_log?: OTMStatusLog[];
}

export interface OTMStatusLog {
  id: string;
  otm_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  notes: string | null;
  created_at: string;
  changed_by_profile?: Profile;
}

export interface OTMAttachment {
  id: string;
  otm_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string;
  file_type: AttachmentType | null;
  phase: AttachmentPhase | null;
  created_at: string;
}

export interface KPIData {
  total_requests: number;
  resolved: number;
  avg_completion_hours: number;
  pending: number;
  scheduled: number;
  in_progress: number;
  awaiting_conformity: number;
  closed: number;
  cancelled: number;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_location: { lat: number; lng: number } | null;
  check_out_location: { lat: number; lng: number } | null;
  tags: string[]; // e.g. "Tarde", "Falta"
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export const STATUS_LABELS: Record<OTMStatus, string> = {
  pending: 'Pendiente',
  scheduled: 'Programado',
  in_progress: 'En Proceso',
  rq: 'Requerimiento',
  awaiting_supervisor: 'Finalizado - Visto Bueno',
  awaiting_conformity: 'Finalizado - Conformidad',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: 'Baja (6 - 10 días)',
  medium: 'Media (3 - 5 días)',
  high: 'Alta (1 - 2 días)',
};

export const FAILURE_TYPES = [
  '01. Operador de Calderos',
  '02. Piscinero',
  '03. Electricista',
  '04. Carpintero',
  '05. Jardinero',
  '06. Gasfitero',
  '07. Albañil',
  '08. Pintor',
  '09. Otros'
];

export const AREAS = [
  '01. ACTIVIDADES CULTURALES',
  '02. ADMINISTRACIÓN Y FINANZAS',
  '03. CONTABILIDAD',
  '04. CONTROL DE BIENES PATRIMONIAL',
  '05. PRESUPUESTO',
  '06. TESORERÍA Y CUENTAS POR COBRAR',
  '07. ALOJAMIENTO',
  '08. BAÑOS TURCOS',
  '09. COMUNICACIONES',
  '10. CONCESIONES',
  '11. CONSEJO DIRECTIVO',
  '12. CONTROL Y AUDITORIA',
  '13. DEPORTES',
  '14. EVENTOS',
  '15. GERENCIA GENERAL',
  '16. GESTIÓN HUMANA',
  '17. HOSPITALIDAD',
  '18. INFORMÁTICA',
  '19. JUNTA CALIFICADORA',
  '20. LEGAL',
  '21. LOGÍSTICA',
  '22. MANTENIMIENTO',
  '23. PROGRAMA ADULTO MAYOR',
  '24. PROYECTOS',
  '25. REGISTRO DE ASOCIADOS',
  '26. REMO',
  '27. SEGURIDAD',
  '28. SERVICIOS AL ASOCIADO',
  '29. SERVICIOS GENERALES',
  '30. TRANSPORTE',
  '31. URGENCIAS MÉDICAS',
  '32. VICEPRESIDENCIA'
];

export const LOCATIONS = [
  '01. Ingreso principal',
  '02. Ingreso - Casetas de Seguridad',
  '03. Departamento de Seguridad',
  '04. Módulo administrativo',
  '05. Comedor de empleados',
  '06. Zona de bancos',
  '07. Puerta N°2 Salida emergencia',
  '08. Departamento médico (Tópico 1)',
  '09. Cancha de futbol y basquet',
  '10. Coliseo de basquet',
  '11. Departamento de Nautico',
  '12. Galpon de botes',
  '13. Muelle Náutico',
  '14. Restaurante ZsaZsa',
  '15. Playa N° 1',
  '16. Terraza N° 1',
  '17. Edificio de servicios',
  '18. Delegaciones (Dormitorio bogas)',
  '19. Bar senior',
  '20. Restaurante Los Bachiches',
  '21. Hall principal',
  '22. Restaurante 1875',
  '23. Zona de peluquerías',
  '24. Zona de Remos',
  '25. Comedor de servicios',
  '26. Media luna',
  '27. Auditorio',
  '28. Cancha de Squash',
  '29. Puerta N°3 (puente)',
  '30. Edificio 7 pisos',
  '31. Piscina Olimpica y Patera',
  '32. Camerín de bebes',
  '33. Juego de niños',
  '34. Restaurantes San Telmo y El Parador',
  '35. Espigón N° 1',
  '36. Playa N° 2',
  '37. Restaurante los Remos',
  '38. Coliseo de voley',
  '39. Coliseo de bochas',
  '40. Cancha de frontón',
  '41. Terraza N° 2',
  '42. Coliseo de badminton',
  '43. Tópico 02',
  '44. Edificio estacionamiento',
  '45. Playa de estacionamiento',
  '46. Edificio de baile',
  '47. Vestuario playa N°3',
  '48. Zona de comida - restaurantes',
  '49. Embarcadero 41',
  '50. Capirena',
  '51. Playa N° 3',
  '52. Espigón 2',
  '53. Edificio cultural',
  '54. Ruta caminante 3',
  '55. Mastil',
  '56. Polideportivo - al exterior del Club'
];
