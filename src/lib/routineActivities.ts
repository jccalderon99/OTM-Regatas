import { RoutineActivity } from '../types/routine';

export const routineActivities: RoutineActivity[] = [
  // ================= CALDEROS =================
  {
    id: 'cal-01',
    specialty: 'Calderos',
    sub_specialty: 'Calderos 40 BHP - Piso 5',
    activity: 'Inspección y Encendido',
    questions: [
      { id: 'q1', label: 'Inspección nivel agua/gas', type: 'checkbox', required: true },
      { id: 'q2', label: 'Encendido', type: 'checkbox', required: true },
      { id: 'q3', label: 'Purga', type: 'checkbox', required: true },
      { id: 'q4', label: 'Inspección dureza ablandadores', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'cal-02',
    specialty: 'Calderos',
    sub_specialty: 'Calentadores 40 BHP - Piso 5',
    activity: 'Inspección de Presión y Válvulas',
    questions: [
      { id: 'q1', label: 'Maniobra válvulas agua ingreso', type: 'checkbox', required: true },
      { id: 'q2', label: 'Inspección presión gas', type: 'checkbox', required: true },
      { id: 'q3', label: 'Encendido equipo', type: 'checkbox', required: true },
      { id: 'q4', label: 'Encendido bomba recirculación', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'cal-03',
    specialty: 'Calderos',
    sub_specialty: 'Baños turcos - Jacuzzi',
    activity: 'Limpieza y Monitoreo',
    questions: [
      { id: 'q1', label: 'Limpieza Jacuzzi (Cambio agua)', type: 'checkbox', required: true },
      { id: 'q2', label: 'Encendido radiadores vapor', type: 'checkbox', required: true },
      { id: 'q3', label: 'Encendido bomba/apertura líneas', type: 'checkbox', required: true },
      { id: 'q4', label: 'Monitoreo temperatura/equipos', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'cal-04',
    specialty: 'Calderos',
    sub_specialty: 'Calentador 40 BHP - Sótano',
    activity: 'Inspección de Nivel',
    questions: [
      { id: 'q1', label: 'Inspección nivel agua/gas', type: 'checkbox', required: true },
      { id: 'q2', label: 'Encendido calentador', type: 'checkbox', required: true },
      { id: 'q3', label: 'Monitoreo temperatura', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'cal-05',
    specialty: 'Calderos',
    sub_specialty: 'Caldero 200 BHP',
    activity: 'Inspección General Caldero 200 BHP',
    questions: [
      { id: 'q1', label: 'Inspección nivel agua/gas', type: 'checkbox', required: true },
      { id: 'q2', label: 'Encendido compresora', type: 'checkbox', required: true },
      { id: 'q3', label: 'Encendido caldero', type: 'checkbox', required: true },
      { id: 'q4', label: 'Purga caldero', type: 'checkbox', required: true },
      { id: 'q5', label: 'Inspección líneas/intercambiadores', type: 'checkbox', required: true },
      { id: 'q6', label: 'Purgado intercambiadores', type: 'checkbox', required: true },
      { id: 'q7', label: 'Dosificación químicos', type: 'checkbox', required: true },
      { id: 'q8', label: 'Inspección dureza ablandadores', type: 'checkbox', required: true },
      { id: 'q9', label: 'Monitoreo temperatura/presión', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'cal-06',
    specialty: 'Calderos',
    sub_specialty: 'Lectura de medidores (Calderos)',
    activity: 'Lectura de Medidores Gas',
    questions: [
      { id: 'q1', label: 'Lectura medidores gas GLP concesiones/tanques', type: 'number', required: true }
    ]
  },

  // ================= ELECTRICIDAD =================
  {
    id: 'ele-01',
    specialty: 'Electricidad',
    sub_specialty: 'Tableros e Iluminación',
    activity: 'Checklist de Iluminación y Fuerza',
    questions: [
      { id: 'q1', label: 'Activación iluminación postes - muro perimetral', type: 'checkbox', required: true },
      { id: 'q2', label: 'Desactivación iluminación postes - muro perimetral', type: 'checkbox', required: true },
      { id: 'q3', label: 'Inspección automático sensor nivel - Pozo séptico', type: 'checkbox', required: true },
      { id: 'q4', label: 'Prueba en vacío y medición parámetros - Grupo electrógeno', type: 'checkbox', required: true },
      { id: 'q5', label: 'Instalación, montaje y monitoreo de sonido - Misa', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'ele-02',
    specialty: 'Electricidad',
    sub_specialty: 'Lectura de medidores',
    activity: 'Lectura de Medidores Eléctricos',
    questions: [
      { id: 'q1', label: 'Lectura de medidores energía eléctrica - Concesiones', type: 'number', required: true }
    ]
  },

  // ================= GASFITERÍA =================
  {
    id: 'gas-01',
    specialty: 'Gasfitería',
    sub_specialty: 'Reservorios y Duchas',
    activity: 'Checklist General Hidráulico',
    questions: [
      { id: 'q1', label: 'Inspección duchas de playas', type: 'checkbox', required: true },
      { id: 'q2', label: 'Inspección nivel agua: reservorio principal / tanque elevado / pozo bochas', type: 'checkbox', required: true },
      { id: 'q3', label: 'Limpieza de cascada Media Luna', type: 'checkbox', required: true },
      { id: 'q4', label: 'Maniobra en válvulas cisterna Bochas (abastece ropería)', type: 'checkbox', required: true },
      { id: 'q5', label: 'Maniobra bypass cisterna Náutico (abastece playa 1 y 2)', type: 'checkbox', required: true },
      { id: 'q6', label: 'Purga de hidroneumático de Náutico', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'gas-02',
    specialty: 'Gasfitería',
    sub_specialty: 'Lectura de medidores',
    activity: 'Lectura de Medidores de Agua',
    questions: [
      { id: 'q1', label: 'Lectura de medidores de agua del Club', type: 'number', required: true }
    ]
  },

  // ================= JARDINERÍA =================
  {
    id: 'jar-01',
    specialty: 'Jardinería',
    sub_specialty: 'Riego',
    activity: 'Control de Riego de Zonas',
    questions: [
      {
        id: 'q1',
        label: 'Zona de Riego (Seleccione zona regada)',
        type: 'button_group',
        options: ['Ingreso Principal', 'Zona 1', 'Zona 2', 'Zona 3', 'Goteo Cancha Fútbol/Básquet'],
        required: true
      }
    ]
  },
  {
    id: 'jar-02',
    specialty: 'Jardinería',
    sub_specialty: 'Podadura',
    activity: 'Control de Podadura de Zonas',
    questions: [
      {
        id: 'q1',
        label: 'Zona de Podadura (Seleccione zona podada)',
        type: 'button_group',
        options: ['Hall Principal', 'Terraza N° 1', 'Playa 2', 'Media Luna', 'Zona 3'],
        required: true
      }
    ]
  },
  {
    id: 'jar-03',
    specialty: 'Jardinería',
    sub_specialty: 'Fumigación',
    activity: 'Control de Fumigación',
    questions: [
      { id: 'q1', label: 'Lugar exacto de fumigación', type: 'text', required: true }
    ]
  },

  // ================= PISCINAS =================
  {
    id: 'pis-01',
    specialty: 'Piscinas',
    sub_specialty: 'Piscina Olímpica',
    activity: 'Limpieza y Parámetros - Olímpica',
    questions: [
      { id: 'q1', label: 'Aspirado de piscina olímpica', type: 'checkbox', required: true },
      { id: 'q2', label: 'Limpieza de canaletas y rejillas perimetrales', type: 'checkbox', required: true },
      { id: 'q3', label: 'Retiro de sólidos superficiales (Hojas / insectos / cabellos)', type: 'checkbox', required: true },
      { id: 'q4', label: 'Control y dosificación de productos químicos (Cloro / Alguicida / Clarificante)', type: 'checkbox', required: true },
      { id: 'q5', label: 'Control y limpieza de filtros', type: 'checkbox', required: true },
      { id: 'q6', label: 'Toma de pH (ideal 7.2 - 7.6)', type: 'number', required: true },
      { id: 'q7', label: 'Cloro residual (ppm)', type: 'number', required: true },
      { id: 'q8', label: 'Temperatura (°C)', type: 'number', required: true }
    ]
  },
  {
    id: 'pis-02',
    specialty: 'Piscinas',
    sub_specialty: 'Piscina Techada',
    activity: 'Limpieza y Parámetros - Techada',
    questions: [
      { id: 'q1', label: 'Aspirado de piscina techada', type: 'checkbox', required: true },
      { id: 'q2', label: 'Limpieza de lunas perimetrales de la piscina', type: 'checkbox', required: true },
      { id: 'q3', label: 'Control y dosificación de productos químicos (Cloro / Alguicida / Clarificante)', type: 'checkbox', required: true },
      { id: 'q4', label: 'Control y limpieza de filtros', type: 'checkbox', required: true },
      { id: 'q5', label: 'Toma de pH (ideal 7.2 - 7.6)', type: 'number', required: true },
      { id: 'q6', label: 'Cloro residual (ppm)', type: 'number', required: true },
      { id: 'q7', label: 'Temperatura (°C)', type: 'number', required: true }
    ]
  },
  {
    id: 'pis-03',
    specialty: 'Piscinas',
    sub_specialty: 'Piscina Patera',
    activity: 'Limpieza y Parámetros - Patera',
    questions: [
      { id: 'q1', label: 'Aspirado de piscina patera', type: 'checkbox', required: true },
      { id: 'q2', label: 'Retiro de sólidos superficiales', type: 'checkbox', required: true },
      { id: 'q3', label: 'Control y dosificación de productos químicos (Cloro / Alguicida / Clarificante)', type: 'checkbox', required: true },
      { id: 'q4', label: 'Control y limpieza de filtros', type: 'checkbox', required: true },
      { id: 'q5', label: 'Toma de pH (ideal 7.2 - 7.6)', type: 'number', required: true },
      { id: 'q6', label: 'Cloro residual (ppm)', type: 'number', required: true },
      { id: 'q7', label: 'Temperatura (°C)', type: 'number', required: true }
    ]
  }
];

export const ROUTINE_SPECIALTIES = [...new Set(routineActivities.map(a => a.specialty))].sort() as string[];

export function getSubSpecialties(specialty: string, activities: RoutineActivity[] = routineActivities) {
  return [...new Set(activities.filter(a => a.specialty === specialty).map(a => a.sub_specialty))].sort();
}

export function getActivitiesForSub(specialty: string, subSpecialty: string, activities: RoutineActivity[] = routineActivities) {
  return activities.filter(a => a.specialty === specialty && a.sub_specialty === subSpecialty);
}
