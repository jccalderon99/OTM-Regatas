import { Profile, OTMRequest, OTMStatusLog, OTMStatus, Urgency, AssignmentType, RQType, RQMagnitude } from '../types';

const techNames = [
  "Antonio Angulo Malasquez", "Cirilo Huanca Ramos", "Cirilo Inca Taquire",
  "Ciro Diaz Sifuentes", "Diego Nolasco Mendoza", "Eduardo Jorge Rivera",
  "Eliseo Cuadros Moya", "Elizabeth Panez Abollaneda", "Eustaquio Ñahuis Cuya",
  "Franco Ccatamayo Quispe", "Jeyson Palomino Rodriguez", "John Hurtado Quintanilla",
  "Jose Anculli Rojas", "Jose Canchari Sanchez", "Juan Enciso Guzman",
  "Juan Soto Sanchez", "Julio Briceño Llerena", "Julio Hernandez Fernandez",
  "Luis Zamata Canaza", "Martin Salazar Salcedo", "Maximo Rodriguez Huamani",
  "Mishell Cavero Cenepo", "Moises Andia Sanchez", "Rene Roca Esquivel",
  "Rogelio Herrera Lazaro", "Saúl Castro Curahua"
];

const technicians: Profile[] = techNames.map((name, i) => ({
  id: `tech-${i + 1}`,
  full_name: name,
  email: `${name.split(' ')[0].toLowerCase()}@clubregatas.org.pe`,
  role: 'technician',
  area_sector: '22. MANTENIMIENTO',
  position: 'Técnico Especialista',
  phone: '999000000',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

const rawUsersData = [
  { em: 'cpulache@clubregatas.org.pe', nm: 'Claudia Pulache', cg: 'Asistente Mantenimiento', ar: '22. MANTENIMIENTO', jnm: 'Marco Alvarez', jcg: 'Coordinador de Mantenimiento', jem: 'malvarez@clubregatas.org.pe' },
  { em: 'malvarez@clubregatas.org.pe', nm: 'Marco Alvarez', cg: 'Coordinador Mantenimiento', ar: '22. MANTENIMIENTO', jnm: 'Marco Alvarez', jcg: 'Coordinador de Mantenimiento', jem: 'malvarez@clubregatas.org.pe' },
  { em: 'bcornetero@clubregatas.org.pe', nm: 'Berenice Cornetero', cg: 'Encargada de anfitriones', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'smasias@clubregatas.org.pe', nm: 'Sonia Masias Luna', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'ldiaz@clubregatas.org.pe', nm: 'Lybe Diaz Taboada', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'pespinoza@clubregatas.org.pe', nm: 'Pedro Espinoza Llantoy', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'gceli@clubregatas.org.pe', nm: 'Gissela Celi Gutierrez', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'kchirinos@clubregatas.org.pe', nm: 'Kelly Chirinos Saveedra', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'imendiolaza@clubregatas.org.pe', nm: 'Ivan Mendiolaza Cornejo', cg: 'Analista de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'rlozada@clubregatas.org.pe', nm: 'Raul Lozada Valdez', cg: 'Coord. de deportes', ar: '13. DEPORTES', jnm: 'Raul Lozada Valdez', jcg: 'Coordinador Deportes', jem: 'rlozada@clubregatas.org.pe' },
  { em: 'ccatano@clubregatas.org.pe', nm: 'Carmen Cataño Pauca', cg: 'Analista de Academias', ar: '13. DEPORTES', jnm: 'Jose Mallma Cuaresma', jcg: 'Coordinador Academias', jem: 'jmallma@clubregatas.org.pe' },
  { em: 'jmallma@clubregatas.org.pe', nm: 'Jose Mallma Cuaresma', cg: 'Coordinador de Academias', ar: '13. DEPORTES', jnm: 'Jose Mallma Cuaresma', jcg: 'Coordinador Academias', jem: 'jmallma@clubregatas.org.pe' },
  { em: 'rvaldivieso@clubregatas.org.pe', nm: 'Ricardo Valdivieso Ancajima', cg: 'Contramaestre Náutico', ar: '13. DEPORTES', jnm: 'Ricardo Valdivieso Ancajima', jcg: 'Contramaestre Náutico', jem: 'rvaldivieso@clubregatas.org.pe' },
  { em: 'pflores@clubregatas.org.pe', nm: 'Pedro Flores Carhuavilca', cg: 'Asistente Administrativo - Náutico', ar: '13. DEPORTES', jnm: 'Ricardo Valdivieso Ancajima', jcg: 'Contramaestre Náutico', jem: 'rvaldivieso@clubregatas.org.pe' },
  { em: 'rrachitoff@clubregatas.org.pe', nm: 'Raúl Rachitoff Carranza', cg: 'Director Vocal', ar: '22. MANTENIMIENTO', jnm: 'Raúl Rachitoff Carranza', jcg: 'Director Vocal', jem: 'rrachitoff@clubregatas.org.pe' },
  { em: 'jmartinez@clubregatas.org.pe', nm: 'Janet Martínez', cg: 'Supervisor Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'jberru@clubregatas.org.pe', nm: 'Jorge Berru', cg: 'Supervisor Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'jhiginio@clubregatas.org.pe', nm: 'Jesús Higinio', cg: 'Supervisor Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'jbarrera@clubregatas.org.pe', nm: 'Julio Barrera Castillo', cg: 'Supervisor Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'practicantessgg@clubregatas.org.pe', nm: 'Miguel Yzquierdo', cg: 'Practicante Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'dvalentin@clubregatas.org.pe', nm: 'Diego Valentin Rios', cg: 'Coordinador de Servicios Generales', ar: '29. SERVICIOS GENERALES', jnm: 'Diego Valentin Rios', jcg: 'Coordinador de Servicios Generales', jem: 'dvalentin@clubregatas.org.pe' },
  { em: 'jsotomayor2406@gmail.com', nm: 'Javier Sotomayor', cg: 'Sub Gerente De Seguridad Y SSOMA', ar: '27. SEGURIDAD', jnm: 'Javier Sotomayor', jcg: 'Sub Gerente De Seguridad Y SSOMA', jem: 'jsotomayor2406@gmail.com' },
  { em: 'oscarvilas1c@gmail.com', nm: 'Oscar Vilas', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'pieromendozza@gmail.com', nm: 'Piero Mendoza', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'jhasmincr02@gmail.com', nm: 'Zenaida Cardenas', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'dtuesta123@gmail.com', nm: 'David Tuesta', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'jerika5591@gmail.com', nm: 'Jerika Jacinto', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'ibpastrana02@gmail.com', nm: 'Fredy Pastrana', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'aracelyrebatta81@gmail.com', nm: 'Aracely Rebatta', cg: 'Personal de trato directo', ar: '27. SEGURIDAD', jnm: 'Berenice Cornetero', jcg: 'Encargada de equipo del trato directo', jem: 'bcornetero@clubregatas.org.pe' },
  { em: 'mvela@clubregatas.org.pe', nm: 'Matilde Vela Bardales', cg: 'Administración Coworking', ar: '01. ACTIVIDADES CULTURALES', jnm: 'Matilde Vela Bardales', jcg: 'Administración Coworking', jem: 'mvela@clubregatas.org.pe' },
  { em: 'gespinoza@clubregatas.org.pe', nm: 'Gean Espinoza Padilla', cg: 'Supervisor de concesiones', ar: '10. CONCESIONES', jnm: 'Joan Bernuy', jcg: 'Encargado de Concesiones', jem: 'jbernuy@clubregatas.org.pe' },
  { em: 'jbernuy@clubregatas.org.pe', nm: 'Joan Bernuy', cg: 'Encargado de Concesiones', ar: '10. CONCESIONES', jnm: 'Joan Bernuy', jcg: 'Encargado de Concesiones', jem: 'jbernuy@clubregatas.org.pe' }
];

const generalUsers: Profile[] = rawUsersData.map((d, i) => {
  const isJefatura = d.nm === d.jnm;
  
  return {
    id: `usr-${i + 1}`,
    full_name: d.nm,
    email: d.em,
    role: isJefatura ? 'jefatura' : 'requester',
    area_sector: d.ar,
    position: d.cg,
    jefatura_name: d.jnm,
    jefatura_position: d.jcg,
    jefatura_email: d.jem,
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
});

export let DEMO_USERS: Profile[] = [
  {
    id: 'admin-1',
    full_name: 'Jose Calderon',
    email: 'jccalderon@clubregatas.org.pe',
    role: 'admin',
    area_sector: '22. MANTENIMIENTO',
    position: 'Apoyo de Mantenimiento / Administrador',
    jefatura_name: 'Marco Alvarez',
    jefatura_position: 'Coordinador de Mantenimiento',
    jefatura_email: 'malvarez@clubregatas.org.pe',
    phone: '999000000',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sup-1',
    full_name: 'Diana Altamirano',
    email: 'daltamirano@clubregatas.org.pe',
    role: 'supervisor',
    area_sector: '22. MANTENIMIENTO',
    position: 'Supervisor Mantenimiento',
    jefatura_name: 'Marco Alvarez',
    jefatura_position: 'Coordinador de Mantenimiento',
    jefatura_email: 'malvarez@clubregatas.org.pe',
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sup-2',
    full_name: 'Marlon Rivera',
    email: 'mrivera@clubregatas.org.pe',
    role: 'supervisor',
    area_sector: '22. MANTENIMIENTO',
    position: 'Supervisor Mantenimiento',
    jefatura_name: 'Marco Alvarez',
    jefatura_position: 'Coordinador de Mantenimiento',
    jefatura_email: 'malvarez@clubregatas.org.pe',
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sup-3',
    full_name: 'Wiliam Anticona',
    email: 'wanticona@clubregatas.org.pe',
    role: 'supervisor',
    area_sector: '22. MANTENIMIENTO',
    position: 'Supervisor Mantenimiento',
    jefatura_name: 'Marco Alvarez',
    jefatura_position: 'Coordinador de Mantenimiento',
    jefatura_email: 'malvarez@clubregatas.org.pe',
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sup-4',
    full_name: 'Leomar Huaraca',
    email: 'lhuaraca@clubregatas.org.pe',
    role: 'supervisor',
    area_sector: '22. MANTENIMIENTO',
    position: 'Supervisor Mantenimiento',
    jefatura_name: 'Marco Alvarez',
    jefatura_position: 'Coordinador de Mantenimiento',
    jefatura_email: 'malvarez@clubregatas.org.pe',
    phone: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  ...technicians,
  ...generalUsers
];

export const generateOTMCode = (area?: string, specialty?: string, sequence: number = 1) => {
  const aa = area ? area.split('.')[0].trim().padStart(2, '0') : '00';
  const ee = specialty ? specialty.split('.')[0].trim().padStart(2, '0') : '00';
  const nn = String(sequence).padStart(4, '0');
  return `OTM${aa}${ee}-${nn}`;
};

// Helper for dates
const getDateShift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const statuses: OTMStatus[] = ['pending', 'scheduled', 'in_progress', 'rq', 'awaiting_supervisor', 'awaiting_conformity', 'closed', 'cancelled'];
const urgencies: Urgency[] = ['high', 'medium', 'low'];
const specialties = ['01. Albañilería', '02. Carpintería', '03. Electricidad', '04. Gasfitería', '05. Pintura', '06. Cerrajería', '07. Aire Acondicionado'];

const generatedOTMs: OTMRequest[] = [];
const generatedLogs: OTMStatusLog[] = [];

// Generate 30 OTMs
for (let i = 1; i <= 35; i++) {
  const status = statuses[i % statuses.length];
  const urgency = urgencies[i % urgencies.length];
  const specialty = specialties[i % specialties.length];
  const requester = generalUsers[i % generalUsers.length];
  const supervisor = DEMO_USERS.find(u => u.role === 'supervisor' && u.id === `sup-${(i % 4) + 1}`);
  const technician = technicians[i % technicians.length];
  
  // Shift dates from -7 to +10 days
  const dayShift = (i % 18) - 7;
  const createdAt = getDateShift(dayShift);
  const updatedAt = new Date(createdAt);
  updatedAt.setHours(updatedAt.getHours() + 2);
  
  const id = `otm-gen-${i}`;
  const code = generateOTMCode(requester.area_sector, specialty, 2000 + i);
  
  const otm: OTMRequest = {
    id,
    otm_code: code,
    requester_id: requester.id,
    requester_name: requester.full_name,
    area_sector: requester.area_sector,
    exact_location: `Ubicación ${i}`,
    failure_type: specialty,
    asset: `Equipo ${i}`,
    description: `Descripción detallada de la solicitud generada número ${i}. Requiere atención en ${requester.area_sector}.`,
    urgency,
    location: null,
    status,
    supervisor_id: (status !== 'pending' && status !== 'cancelled') ? (supervisor?.id || null) : null,
    supervisor_notes: (status !== 'pending') ? 'Revisado y procesado por supervisión.' : null,
    scheduled_date: (status === 'scheduled' || status === 'in_progress' || status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? getDateShift(dayShift + 1).toISOString() : null,
    technician_id: (status === 'in_progress' || status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? technician.id : null,
    technician_notes: (status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? 'Trabajo completado según lo solicitado.' : null,
    maintenance_type: (status === 'closed' || status === 'awaiting_supervisor') ? 'corrective' : null,
    job_start_time: (status === 'closed' || status === 'awaiting_supervisor') ? createdAt.toISOString() : null,
    job_end_time: (status === 'closed' || status === 'awaiting_supervisor') ? updatedAt.toISOString() : null,
    closed_at: status === 'closed' ? updatedAt.toISOString() : null,
    conformity_rating: status === 'closed' ? 5 : null,
    conformity_notes: status === 'closed' ? 'Excelente trabajo, gracias.' : null,
    conformity_date: status === 'closed' ? updatedAt.toISOString() : null,
    assignment_type: (status !== 'pending' && status !== 'cancelled') ? 'own' : null,
    rq_type: status === 'rq' ? (i % 2 === 0 ? 'supply' : 'service') : null,
    rq_date: status === 'rq' ? createdAt.toISOString() : null,
    rq_materials: status === 'rq' ? 'Materiales varios' : null,
    rq_quantities: status === 'rq' ? '10 unidades' : null,
    attachments: [],
    cancellation_reason: status === 'cancelled' ? 'duplicate' : null,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
  };
  
  generatedOTMs.push(otm);
  
  // Basic log
  generatedLogs.push({
    id: `log-gen-${i}-1`,
    otm_id: id,
    previous_status: null,
    new_status: 'pending',
    changed_by: requester.id,
    notes: 'Solicitud creada',
    created_at: createdAt.toISOString()
  });
  
  if (status !== 'pending') {
    generatedLogs.push({
      id: `log-gen-${i}-2`,
      otm_id: id,
      previous_status: 'pending',
      new_status: status,
      changed_by: supervisor?.id || 'admin-1',
      notes: 'Estado actualizado',
      created_at: updatedAt.toISOString()
    });
  }
}

export const DEMO_OTMS: OTMRequest[] = [
  ...generatedOTMs
];

export const DEMO_STATUS_LOGS: OTMStatusLog[] = [
  ...generatedLogs
];

export const getDemoUser = (email: string) => DEMO_USERS.find(u => u.email === email);
export const addDemoUser = (user: Profile) => { DEMO_USERS.push(user); };
export const updateDemoUserRole = (userId: string, role: any, area: string | null) => {
  const user = DEMO_USERS.find(u => u.id === userId);
  if (user) { user.role = role; user.area_sector = area; }
};
export const getDemoOTMsForUser = (user: Profile) => {
  if (user.role === 'admin' || user.role === 'supervisor') return DEMO_OTMS;
  if (user.role === 'jefatura') return DEMO_OTMS.filter(o => o.area_sector === user.area_sector);
  if (user.role === 'requester') return DEMO_OTMS.filter(o => o.area_sector === user.area_sector);
  if (user.role === 'technician') return DEMO_OTMS.filter(o => o.technician_id === user.id);
  return DEMO_OTMS;
};
