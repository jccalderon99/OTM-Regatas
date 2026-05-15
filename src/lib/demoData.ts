import { Profile, OTMRequest, OTMStatusLog } from '../types';

const techNames = [
  "Ciro Diaz Sifuentes", "Diego Nolasco Mendoza", "Julio Briceño Llerena", "John Hurtado Quintanilla",
  "Franco Ccatamayo Quispe", "Juan Enciso Guzman", "Eustaquio Ñahuis Cuya", "Cirilo Huanca Ramos",
  "Julio Hernandez Fernandez", "Luis Zamata Canaza", "Rene Roca Esquivel", "Mishell Cavero Cenepo",
  "Saúl Castro Curahua", "Eduardo Jorge Rivera", "Eliseo Cuadros Moya", "Martin Salazar Salcedo",
  "Jose Canchari Sanchez", "Jose Anculli Rojas", "Rogelio Herrera Lazaro", "Maximo Rodriguez Huamani",
  "Elizabeth Panez Abollaneda", "Cirilo Inca Taquire", "Jeyson Palomino Rodriguez", "Juan Soto Sanchez",
  "Moises Andia Sanchez", "Antonio Angulo Malasquez"
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
  const isSupervisorGenerales = d.cg.includes('Supervisor Servicios Generales') || d.cg.includes('Supervisor de concesiones');
  
  // They are technically "requesters" of OTMs, but within the system maybe they should be Jefatura if they are bosses.
  // The system's 'supervisor' role is specifically for Mantenimiento technicians.
  // So we will map them to 'jefatura' if isJefatura, else 'requester'.
  
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
  // Admin (Kept exactly as requested, but updated with his new details from the image)
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
  // The 4 Maintenance Supervisors
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

export const generateOTMCode = () => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `OTM-${dateStr}-${randomNum}`;
};

const d1 = new Date(); d1.setDate(d1.getDate() - 2);
const d2 = new Date(); d2.setDate(d2.getDate() - 1);
const d3 = new Date(); d3.setHours(d3.getHours() - 4);

export const DEMO_OTMS: OTMRequest[] = [
  {
    id: 'otm-1',
    otm_code: 'OTM-20260512-1042',
    requester_id: 'usr-4', // Sonia Masias
    requester_name: 'Sonia Masias Luna',
    area_sector: '13. DEPORTES',
    exact_location: 'Cancha de Frontón N° 3',
    failure_type: '01. Albañilería',
    asset: 'Pared Principal',
    description: 'La pared presenta una grieta profunda en el lado izquierdo. Requiere resane urgente para evitar accidentes.',
    urgency: 'high',
    location: null,
    status: 'pending',
    supervisor_id: null, supervisor_notes: null, scheduled_date: null,
    technician_id: null, technician_notes: null,
    conformity_rating: null, conformity_notes: null, conformity_signature_url: null, conformity_date: null,
    created_at: d1.toISOString(), updated_at: d1.toISOString(), closed_at: null,
  },
  {
    id: 'otm-2',
    otm_code: 'OTM-20260513-2051',
    requester_id: 'usr-1', // Claudia Pulache
    requester_name: 'Claudia Pulache',
    area_sector: '22. MANTENIMIENTO',
    exact_location: 'Baño Principal - Nivel 2',
    failure_type: '04. Gasfitería',
    asset: 'Lavadero',
    description: 'Fuga de agua en la tubería debajo del lavadero principal. El suelo está inundado.',
    urgency: 'high',
    location: null,
    status: 'in_progress',
    supervisor_id: 'sup-1',
    supervisor_notes: 'Prioridad máxima por riesgo de resbalones.',
    scheduled_date: new Date().toISOString(),
    technician_id: 'tech-1',
    technician_notes: 'He cerrado la llave de paso temporalmente. Necesito cambiar la trampa tipo P.',
    conformity_rating: null, conformity_notes: null, conformity_signature_url: null, conformity_date: null,
    created_at: d2.toISOString(), updated_at: new Date().toISOString(), closed_at: null,
  },
  {
    id: 'otm-3',
    otm_code: 'OTM-20260514-0012',
    requester_id: 'usr-4', // Sonia Masias
    requester_name: 'Sonia Masias Luna',
    area_sector: '13. DEPORTES',
    exact_location: 'Gimnasio Nivel 2',
    failure_type: '03. Electricidad',
    asset: 'Iluminación',
    description: 'Tres fluorescentes del sector de pesas libres están parpadeando o quemados.',
    urgency: 'medium',
    location: null,
    status: 'awaiting_conformity',
    supervisor_id: 'sup-1',
    supervisor_notes: 'Cambiar por luces LED.',
    scheduled_date: d3.toISOString(),
    technician_id: 'tech-3',
    technician_notes: 'Se reemplazaron 3 luminarias LED de 40W. Tablero eléctrico revisado sin problemas.',
    conformity_rating: null, conformity_notes: null, conformity_signature_url: null, conformity_date: null,
    created_at: d3.toISOString(), updated_at: new Date().toISOString(), closed_at: null,
  }
];

export const DEMO_STATUS_LOGS: OTMStatusLog[] = [
  { id: 'log-1', otm_id: 'otm-1', previous_status: null, new_status: 'pending', changed_by: 'usr-4', notes: 'Solicitud creada', created_at: d1.toISOString() },
  { id: 'log-2', otm_id: 'otm-2', previous_status: null, new_status: 'pending', changed_by: 'usr-1', notes: 'Solicitud creada', created_at: d2.toISOString() },
  { id: 'log-3', otm_id: 'otm-2', previous_status: 'pending', new_status: 'scheduled', changed_by: 'sup-1', notes: 'Asignado a Gasfitería', created_at: d2.toISOString() },
  { id: 'log-4', otm_id: 'otm-2', previous_status: 'scheduled', new_status: 'in_progress', changed_by: 'tech-1', notes: 'Iniciando inspección', created_at: new Date().toISOString() },
  { id: 'log-5', otm_id: 'otm-3', previous_status: null, new_status: 'pending', changed_by: 'usr-4', notes: 'Solicitud creada', created_at: d3.toISOString() },
  { id: 'log-6', otm_id: 'otm-3', previous_status: 'pending', new_status: 'scheduled', changed_by: 'sup-1', notes: 'Asignado a Electricidad', created_at: d3.toISOString() },
  { id: 'log-7', otm_id: 'otm-3', previous_status: 'scheduled', new_status: 'in_progress', changed_by: 'tech-3', notes: 'Atendiendo cambio de luces', created_at: new Date().toISOString() },
  { id: 'log-8', otm_id: 'otm-3', previous_status: 'in_progress', new_status: 'awaiting_conformity', changed_by: 'tech-3', notes: 'Luces cambiadas. Operativo.', created_at: new Date().toISOString() }
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
