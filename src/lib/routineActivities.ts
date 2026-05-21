export const routineActivities = [
  {
    id: 'rut-01',
    specialty: 'Calderos',
    sub_specialty: 'Calderas de Vapor',
    activity: 'Inspección Semanal de Calderas',
    description: 'Revisión de presión, válvulas de seguridad y niveles de agua.',
    category: 'Seguridad',
    questions: [
      { id: 'q1', label: '¿Presión dentro del rango normal?', type: 'checkbox' as const, required: true },
      { id: 'q2', label: '¿Válvulas de seguridad operativas?', type: 'checkbox' as const, required: true },
      { id: 'q3', label: 'Nivel de agua observado', type: 'text' as const, required: true },
      { id: 'q4', label: 'Observaciones adicionales', type: 'text' as const, required: false },
    ]
  },
  {
    id: 'rut-02',
    specialty: 'Electricista',
    sub_specialty: 'Tableros',
    activity: 'Revisión de Tableros Eléctricos',
    description: 'Cotejo de termografía y limpieza de contactos.',
    category: 'Mantenimiento',
    questions: [
      { id: 'q1', label: '¿Se detectaron puntos calientes?', type: 'checkbox' as const, required: true },
      { id: 'q2', label: '¿Tensión de entrada estable?', type: 'text' as const, required: true },
      { id: 'q3', label: 'Estado de los disyuntores', type: 'select' as const, options: ['Óptimo', 'Regular', 'Crítico'], required: true },
    ]
  },
  {
    id: 'rut-03',
    specialty: 'Gasfitero',
    sub_specialty: 'Bombas',
    activity: 'Control de Bombas de Agua',
    description: 'Prueba de cebado y revisión de fugas en juntas.',
    category: 'Operatividad',
    questions: [
      { id: 'q1', label: '¿Fugas detectadas en la bomba A?', type: 'checkbox' as const, required: true },
      { id: 'q2', label: '¿Fugas detectadas en la bomba B?', type: 'checkbox' as const, required: true },
      { id: 'q3', label: 'Presión de salida (PSI)', type: 'number' as const, required: true },
    ]
  }
] as const;

export const ROUTINE_SPECIALTIES = [...new Set(routineActivities.map(a => a.specialty))].sort() as string[];

export function getSubSpecialties(specialty: string, activities: RoutineActivity[] = routineActivities as unknown as RoutineActivity[]) {
  return [...new Set(activities.filter(a => a.specialty === specialty).map(a => a.sub_specialty))].sort();
}

export function getActivitiesForSub(specialty: string, subSpecialty: string, activities: RoutineActivity[] = routineActivities as unknown as RoutineActivity[]) {
  return activities.filter(a => a.specialty === specialty && a.sub_specialty === subSpecialty);
}

// Import types to avoid errors
import { RoutineActivity } from '../context/RoutineActivityContext';
