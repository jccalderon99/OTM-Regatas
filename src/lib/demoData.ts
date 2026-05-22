import { Profile, OTMRequest, OTMAttachment, OTMStatusLog, OTMStatus, Urgency, AssignmentType, RQType, RQMagnitude } from '../types';

const rawTechData = [
  { nm: 'Diaz Sifuentes Ciro', sp: '01. Operador de Calderos' },
  { nm: 'Nolasco Mendoza Diego', sp: '01. Operador de Calderos' },
  { nm: 'Briceño Llerena Julio', sp: '01. Operador de Calderos' },
  { nm: 'Hurtado Quintanilla John', sp: '01. Operador de Calderos' },
  { nm: 'Ccatamayo Quispe Franco', sp: '01. Operador de Calderos' },
  { nm: 'Zamata Canaza Luis', sp: '02. Piscinero' },
  { nm: 'Roca Esquivel Rene', sp: '02. Piscinero' },
  { nm: 'Cavero Cenepo Mishell', sp: '02. Piscinero' },
  { nm: 'Castro Curahua Saúl', sp: '02. Piscinero' },
  { nm: 'Jorge Rivera Eduardo', sp: '03. Electricista' },
  { nm: 'Cuadros Moya Eliseo', sp: '03. Electricista' },
  { nm: 'Salazar Salcedo Martin', sp: '03. Electricista' },
  { nm: 'Canchari Sanchez Jose', sp: '03. Electricista' },
  { nm: 'Anculli Rojas Jose', sp: '04. Carpintero' },
  { nm: 'Enciso Guzman Juan', sp: '05. Jardinero' },
  { nm: 'Ñahuis Cuya Eustaquio', sp: '05. Jardinero' },
  { nm: 'Huanca Ramos Cirilo', sp: '05. Jardinero' },
  { nm: 'Hernandez Fernandez Julio', sp: '05. Jardinero' },
  { nm: 'Herrera Lazaro Rogelio', sp: '06. Gasfitero' },
  { nm: 'Rodriguez Huamani Maximo', sp: '06. Gasfitero' },
  { nm: 'Panez Abollaneda Elizabeth', sp: '06. Gasfitero' },
  { nm: 'Inca Taquire Cirilo', sp: '06. Gasfitero' },
  { nm: 'Palomino Rodriguez Jeyson', sp: '07. Albañil' },
  { nm: 'Soto Sanchez Juan', sp: '07. Albañil' },
  { nm: 'Andia Sanchez Moises', sp: '08. Pintor' },
  { nm: 'Angulo Malasquez Antonio', sp: '08. Pintor' }
];

const technicians: Profile[] = rawTechData.map((data, i) => ({
  id: `tech-${i + 1}`,
  full_name: data.nm,
  email: `${data.nm.split(' ')[0].toLowerCase()}@clubregatas.org.pe`,
  role: 'technician',
  area_sector: '22. MANTENIMIENTO',
  position: data.sp,
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
    full_name: 'Maria Pizarro',
    email: 'mpizarro@clubregatas.org.pe',
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
const specialties = ['01. Operador de Calderos', '02. Piscinero', '03. Electricista', '04. Carpintero', '05. Jardinero', '06. Gasfitero', '07. Albañil', '08. Pintor', '09. Otros'];

const specialtyImages: Record<string, { before: string[]; after: string[] }> = {
  '01. Operador de Calderos': {
    before: [
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1581092162384-8987c1794ed9?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '02. Piscinero': {
    before: [
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1560090596-13d4350818ec?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '03. Electricista': {
    before: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1558211583-d26f6221551c?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '04. Carpintero': {
    before: [
      'https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1453733190148-c44698c265f8?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1507312436339-df11dfaf53f4?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '05. Jardinero': {
    before: [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1508873696983-2df519f0397e?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '06. Gasfitero': {
    before: [
      'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1542013936693-8848e5742383?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1585421515284-df9700e4da5a?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '07. Albañil': {
    before: [
      'https://images.unsplash.com/photo-1581094288338-2314dddb7eed?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1531834685032-c34bf0d8b939?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '08. Pintor': {
    before: [
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1525909002-1b057045640c?w=500&auto=format&fit=crop&q=60'
    ]
  },
  '09. Otros': {
    before: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1530124412963-7a728863aabf?w=500&auto=format&fit=crop&q=60'
    ],
    after: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60'
    ]
  }
};

const generatedOTMs: OTMRequest[] = [];
const generatedLogs: OTMStatusLog[] = [];

// Generate 150 OTMs
for (let i = 1; i <= 150; i++) {
  // Balanced status distribution for 150 items
  let status: OTMStatus = 'pending';
  if (i <= 30) status = 'closed';
  else if (i <= 55) status = 'awaiting_conformity';
  else if (i <= 80) status = 'awaiting_supervisor';
  else if (i <= 105) status = 'in_progress';
  else if (i <= 125) status = 'scheduled';
  else if (i <= 140) status = 'pending';
  else if (i <= 146) status = 'rq';
  else status = 'cancelled';

  const urgency = urgencies[i % urgencies.length];
  const specialty = specialties[i % specialties.length];
  const requester = generalUsers[i % generalUsers.length];
  const supervisor = DEMO_USERS.find(u => u.role === 'supervisor' && u.id === `sup-${(i % 4) + 1}`);
  const technician = technicians[i % technicians.length];
  
  // Shift dates from -1 to -30 days to have complete historic reporting
  const dayShift = -((i % 30) + 1);
  const createdAt = getDateShift(dayShift);
  const updatedAt = new Date(createdAt);
  updatedAt.setHours(updatedAt.getHours() + (2 + (i % 8)));
  
  const locations = ['Tópico 1', 'Baño Principal', 'Oficina 302', 'Piscina Olímpica', 'Cancha de Tenis 1', 'Comedor Principal', 'Zona de Parrillas', 'Estacionamiento Norte', 'Vestuarios Damas', 'Terraza Náutica'];
  const descriptions: Record<string, string[]> = {
    '01. Operador de Calderos': ['Caldero no enciende', 'Fuga de vapor en válvula', 'Presión irregular en el sistema', 'Fallo de termostato de quemador', 'Bitácora de caldero desactualizada'],
    '02. Piscinero': ['Agua turbia en piscina de niños', 'Bomba de recirculación hace ruido', 'Nivel de cloro bajo', 'Fuga detectada en tubería de rebose', 'Filtro de arena saturado'],
    '03. Electricista': ['Cortocorticito en luminaria', 'Tomacorriente sin energía', 'Luz parpadeando en pasillo', 'Disyuntor principal saltado', 'Reflectores quemados en cancha de tenis'],
    '04. Carpintero': ['Puerta descuadrada', 'Chapa trabada', 'Silla de madera rota', 'Mesa de coworking tambalea', 'Repisas desprendidas en almacén'],
    '05. Jardinero': ['Pasto crecido en zona sur', 'Sistema de riego automático no funciona', 'Poda de árboles grandes', 'Plaga detectada en setos', 'Césped marchito en ingreso principal'],
    '06. Gasfitero': ['Fuga de agua en inodoro', 'Grifería rota, requiere cambio', 'Desagüe atorado', 'Baja presión de agua en duchas', 'Filtración en lavadero de cocina'],
    '07. Albañil': ['Mayólica desprendida', 'Humedad en pared', 'Resane de pared lateral', 'Fisura en vereda peatonal', 'Zócalo roto en vestuarios'],
    '08. Pintor': ['Pintura descascarada', 'Repintado de señales', 'Mancha en techo', 'Pintura sucia en pasillo exterior', 'Demarcación borrosa en estacionamiento'],
    '09. Otros': ['Mantenimiento preventivo general', 'Revisión de equipos', 'Apoyo en traslado de mobiliario', 'Revisión de aire acondicionado', 'Lubricación de portón principal']
  };
  
  const id = `otm-gen-${i}`;
  const code = generateOTMCode(requester.area_sector || undefined, specialty, 2000 + i);
  
  const realisticLocation = locations[i % locations.length];
  const realisticDesc = descriptions[specialty] ? descriptions[specialty][i % descriptions[specialty].length] : descriptions['09. Otros'][0];
  
  // Attachments generation
  const atts: OTMAttachment[] = [];
  const specialtyImagesList = specialtyImages[specialty] || specialtyImages['09. Otros'];
  
  const beforeUrl = specialtyImagesList.before[i % specialtyImagesList.before.length];
  atts.push({
    id: `att-gen-${i}-1`,
    otm_id: id,
    uploaded_by: requester.id,
    file_url: beforeUrl,
    file_name: 'foto_reportada.jpg',
    file_type: 'before_photo',
    phase: 'request',
    created_at: createdAt.toISOString(),
  });

  if (['in_progress', 'awaiting_supervisor', 'awaiting_conformity', 'closed'].includes(status)) {
    const afterUrl = specialtyImagesList.after[i % specialtyImagesList.after.length];
    atts.push({
      id: `att-gen-${i}-2`,
      otm_id: id,
      uploaded_by: technician.id,
      file_url: afterUrl,
      file_name: 'foto_finalizado.jpg',
      file_type: 'after_photo',
      phase: 'execution',
      created_at: updatedAt.toISOString(),
    });
  }

  const otm: OTMRequest = {
    id,
    otm_code: code,
    requester_id: requester.id,
    requester_name: requester.full_name,
    area_sector: requester.area_sector || '',
    exact_location: realisticLocation,
    failure_type: specialty,
    asset: `Equipo ${i}`,
    description: realisticDesc,
    urgency,
    location: i % 2 === 0 ? '08. Departamento médico (Tópico 1)' : '22. Restaurante 1875',
    status,
    supervisor_id: (status !== 'pending' && status !== 'cancelled') ? (supervisor?.id || null) : null,
    supervisor_notes: (status !== 'pending') ? 'Revisado y procesado por supervisión.' : null,
    scheduled_date: (status === 'scheduled' || status === 'in_progress' || status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? (() => {
      const sd = getDateShift(dayShift + 1);
      sd.setHours(8 + (i % 10), (i * 7) % 60, 0, 0);
      return sd.toISOString();
    })() : null,
    technician_id: (status === 'scheduled' || status === 'in_progress' || status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? technician.id : null,
    technician_notes: (status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? 'Trabajo completado según lo solicitado.' : null,
    maintenance_type: (status === 'closed' || status === 'awaiting_supervisor') ? 'corrective' : null,
    job_start_time: (status === 'closed' || status === 'awaiting_supervisor') ? createdAt.toISOString() : null,
    job_end_time: (status === 'closed' || status === 'awaiting_supervisor') ? updatedAt.toISOString() : null,
    closed_at: status === 'closed' ? updatedAt.toISOString() : null,
    conformity_rating: status === 'closed' ? (i % 2 === 0 ? 5 : 4) : null,
    conformity_notes: status === 'closed' ? 'Excelente trabajo, gracias.' : null,
    conformity_signature_url: null,
    conformity_date: status === 'closed' ? updatedAt.toISOString() : null,
    assignment_type: (status !== 'pending' && status !== 'cancelled') ? 'own' : null,
    contractor_name: null,
    contractor_date: null,
    contractor_detail: null,
    rq_type: status === 'rq' ? (i % 2 === 0 ? 'supply' : 'service') : null,
    rq_date: status === 'rq' ? createdAt.toISOString() : null,
    rq_materials: status === 'rq' ? 'Materiales varios' : null,
    rq_quantities: status === 'rq' ? '10 unidades' : null,
    rq_service_desc: status === 'rq' ? 'Servicio técnico especializado' : null,
    rq_magnitude: status === 'rq' ? (i % 2 === 0 ? 'puntual' : 'integral') : null,
    attachments: atts,
    assigned_technicians: (status === 'scheduled' || status === 'in_progress' || status === 'closed' || status === 'awaiting_supervisor' || status === 'awaiting_conformity') ? [{
      technician_id: technician.id,
      technician: technician
    }] : [],
    cancellation_reason: status === 'cancelled' ? 'duplicate' : null,
    cancellation_detail: null,
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
