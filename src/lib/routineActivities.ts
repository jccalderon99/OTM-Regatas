import { RoutineActivity } from '../types/routine';

type SeedRow = { specialty: string; sub_specialty: string; activity: string };

const SEED_ROWS: SeedRow[] = [
  // Calderos
  ...[
    'Inspección visual de manómetros y válvulas',
    'Control de presión y temperatura de operación',
    'Purga de condensados y revisión de purgadores',
    'Verificación de nivel en vaso expansor',
    'Revisión de quemador y llama',
    'Limpieza de filtros y rejillas',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Calderos 40 BHP', activity })),
  ...[
    'Inspección de termostato y resistencias',
    'Control de temperatura de salida',
    'Revisión de válvulas y conexiones',
    'Purga de aire en circuito',
    'Verificación de presión de trabajo',
    'Limpieza de cámara de combustión',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Calentadores 40 BHP', activity })),
  ...[
    'Control de temperatura del agua',
    'Revisión de bomba de circulación',
    'Inspección de sellos y uniones',
    'Limpieza de filtros de succión',
    'Verificación de válvulas de llenado',
    'Control de nivel y drenaje',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Baños turcos - Jacuzzi', activity })),
  ...[
    'Inspección de quemador y encendido',
    'Control de presión y temperatura',
    'Revisión de tuberías y válvulas',
    'Purga de condensados',
    'Verificación de ventilación del sótano',
    'Limpieza de quemador',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Calentador 40 BHP Sótano', activity })),
  ...[
    'Inspección de manómetros de alta presión',
    'Control de temperatura y presión de vapor',
    'Revisión de válvulas de seguridad',
    'Purga de condensados del sistema',
    'Verificación de nivel de agua alimentación',
    'Inspección de quemador y tiro',
    'Análisis de gases de combustión',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Caldero 200 BHP', activity })),
  ...[
    'Lectura de medidor de gas',
    'Lectura de medidor de agua',
    'Lectura de medidor eléctrico auxiliar',
    'Registro fotográfico de lecturas',
    'Verificación de sellos y numeración',
    'Reporte de consumos al supervisor',
  ].map(activity => ({ specialty: 'Calderos', sub_specialty: 'Lectura de medidores', activity })),

  // Electricidad
  ...[
    'Inspección de tableros eléctricos',
    'Revisión de breakers y conexiones',
    'Control de iluminación perimetral',
    'Verificación de tomacorrientes en áreas comunes',
    'Inspección de luminarias de emergencia',
    'Registro de novedades en bitácora',
  ].map(activity => ({ specialty: 'Electricidad', sub_specialty: 'General', activity })),

  // Gasfitería
  ...[
    'Revisión de llaves de paso principales',
    'Inspección de fugas en baños y cocinas',
    'Control de presión de agua',
    'Verificación de desagües y sumideros',
    'Revisión de bombas de agua',
    'Registro de novedades en bitácora',
  ].map(activity => ({ specialty: 'Gasfitería', sub_specialty: 'General', activity })),

  // Jardinería
  ...[
    'Riego de áreas verdes programadas',
    'Control de aspersores y mangueras',
    'Revisión de válvulas de riego',
    'Inspección de estado del césped',
    'Limpieza de canaletas de riego',
    'Registro de áreas regadas',
  ].map(activity => ({ specialty: 'Jardinería', sub_specialty: 'Riego', activity })),
  ...[
    'Poda de setos y arbustos',
    'Recolección de residuos vegetales',
    'Limpieza de caminos y bordes',
    'Inspección de árboles en riesgo',
    'Afilado y mantenimiento de herramientas',
    'Registro de áreas podadas',
  ].map(activity => ({ specialty: 'Jardinería', sub_specialty: 'Podadura', activity })),

  // Piscina — Piscina Olímpica (10 actividades de verificación)
  ...[
    'Limpieza de cubetas y skimmers',
    'Cepillado de paredes y fondo',
    'Aspirado del fondo de piscina',
    'Control de pH y cloro residual',
    'Dosificación de químicos según protocolo',
    'Limpieza y revisión de filtros',
    'Revisión de bombas de circulación',
    'Inspección de luminarias subacuáticas',
    'Control de nivel de agua',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Piscina', sub_specialty: 'Piscina Olímpica', activity })),
  ...[
    'Limpieza de cubetas y skimmers',
    'Control de pH y cloro',
    'Aspirado parcial del fondo',
    'Revisión de bomba y filtro',
    'Control de temperatura del agua',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Piscina', sub_specialty: 'Piscina Techada', activity })),
  ...[
    'Limpieza de superficie y skimmers',
    'Control de pH y cloro',
    'Revisión de sistema de filtrado',
    'Inspección de escaleras y barandas',
    'Control de nivel de agua',
    'Registro de lecturas en bitácora',
  ].map(activity => ({ specialty: 'Piscina', sub_specialty: 'Piscina Patera', activity })),
];

let seedId = 1;
export const DEMO_ROUTINE_ACTIVITIES: RoutineActivity[] = SEED_ROWS.map(row => ({
  id: `routine-act-${seedId++}`,
  specialty: row.specialty,
  sub_specialty: row.sub_specialty,
  activity: row.activity,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

export const ROUTINE_SPECIALTIES = [...new Set(DEMO_ROUTINE_ACTIVITIES.map(a => a.specialty))];

export function getSubSpecialties(specialty: string, activities: RoutineActivity[]): string[] {
  return [...new Set(activities.filter(a => a.specialty === specialty).map(a => a.sub_specialty))];
}

export function getActivitiesForSub(
  specialty: string,
  subSpecialty: string,
  activities: RoutineActivity[]
): RoutineActivity[] {
  return activities.filter(a => a.specialty === specialty && a.sub_specialty === subSpecialty);
}
