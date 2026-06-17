import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { RQRecord, RQStatus, RQMaterial } from '../types';
import { useOTM } from './OTMContext';

interface RQContextType {
  rqs: RQRecord[];
  getRQById: (id: string) => RQRecord | undefined;
  getRQByOtmId: (otmId: string) => RQRecord | undefined;
  createRQRecord: (data: Omit<RQRecord, 'id' | 'item_number' | 'created_at' | 'status' | 'status_dates'>) => RQRecord;
  updateRQRecord: (id: string, fields: Partial<RQRecord>) => void;
  updateRQStatus: (id: string, status: RQStatus, observations?: string) => void;
}

const RQContext = createContext<RQContextType | null>(null);

export function RQProvider({ children }: { children: ReactNode }) {
  const { otms, updateOTMFields, updateOTMStatus } = useOTM();

  // 5 Initial mock records
  const getInitialRqs = (): RQRecord[] => {
    // Find OTM codes for status 'rq' to make the link realistic
    const otm1 = otms.find(o => o.status === 'rq' || o.id === 'otm-gen-47') || otms[46];
    const otm2 = otms.find(o => o.status === 'rq' && o.id !== otm1?.id) || otms[47];

    return [
      {
        id: 'rq-mock-1',
        item_number: 1,
        otm_id: otm1?.id || 'otm-gen-47',
        otm_code: otm1?.otm_code || 'OTM1304-2047',
        created_at: new Date(2026, 4, 22, 9, 30).toISOString(),
        supervisor_id: 'sup-1',
        supervisor_name: 'Diana Altamirano',
        type: 'supply',
        description: 'Tuberías y codos de cobre para reparación de filtración de agua.',
        materials: [
          { name: 'Tubería de cobre 1/2"', unit: 'Metros', quantity: 15 },
          { name: 'Codos de cobre 1/2"', unit: 'Unidades', quantity: 10 }
        ],
        rq_number: null,
        sap_number: null,
        status: 'in_approval',
        status_dates: {
          in_approval: new Date(2026, 4, 22, 9, 30).toISOString()
        },
        observations: [
          {
            id: 'obs-mock-1',
            text: 'A la espera del ingreso del nro de RQ por logística.',
            date: new Date(2026, 4, 22, 10, 0).toISOString()
          }
        ]
      },
      {
        id: 'rq-mock-2',
        item_number: 2,
        otm_id: otm2?.id || 'otm-gen-48',
        otm_code: otm2?.otm_code || 'OTM2201-2048',
        created_at: new Date(2026, 4, 23, 10, 15).toISOString(),
        supervisor_id: 'sup-2',
        supervisor_name: 'Marlon Rivera',
        type: 'service',
        description: 'Servicio técnico especializado para mantenimiento y calibración de quemadores del caldero principal.',
        rq_number: 'RQ-10042',
        sap_number: '100029348',
        status: 'in_logistics',
        status_dates: {
          in_approval: new Date(2026, 4, 23, 10, 15).toISOString(),
          in_logistics: new Date(2026, 4, 23, 15, 30).toISOString()
        },
        observations: [
          {
            id: 'obs-mock-2',
            text: 'Cotización aprobada por jefatura. SAP generado.',
            date: new Date(2026, 4, 23, 16, 0).toISOString()
          }
        ]
      },
      {
        id: 'rq-mock-3',
        item_number: 3,
        otm_id: null,
        otm_code: null,
        created_at: new Date(2026, 4, 24, 11, 0).toISOString(),
        supervisor_id: 'sup-3',
        supervisor_name: 'Wiliam Anticona',
        type: 'supply',
        description: 'Materiales eléctricos de reserva para mantenimiento de tableros.',
        materials: [
          { name: 'Cable vulcanizado 3x14 AWG', unit: 'Metros', quantity: 50 },
          { name: 'Cinta aislante 3M', unit: 'Rollos', quantity: 5 }
        ],
        rq_number: 'RQ-10045',
        sap_number: '100029350',
        status: 'in_logistics',
        status_dates: {
          in_approval: new Date(2026, 4, 24, 11, 0).toISOString(),
          in_logistics: new Date(2026, 4, 25, 9, 0).toISOString()
        },
        observations: [
          {
            id: 'obs-mock-3',
            text: 'En proceso de cotización por el área de Logística.',
            date: new Date(2026, 4, 25, 10, 0).toISOString()
          }
        ]
      },
      {
        id: 'rq-mock-4',
        item_number: 4,
        otm_id: null,
        otm_code: null,
        created_at: new Date(2026, 4, 25, 8, 45).toISOString(),
        supervisor_id: 'sup-4',
        supervisor_name: 'Leomar Huaraca',
        type: 'service',
        description: 'Servicio de pintado e impermeabilización de fachada del vestuario playa N°3.',
        rq_number: 'RQ-10046',
        sap_number: '100029351',
        status: 'attended',
        status_dates: {
          in_approval: new Date(2026, 4, 25, 8, 45).toISOString(),
          in_logistics: new Date(2026, 4, 26, 10, 0).toISOString(),
          attended: new Date(2026, 5, 2, 16, 0).toISOString()
        },
        observations: [
          {
            id: 'obs-mock-4',
            text: 'Servicio culminado al 100%. Acta de conformidad firmada.',
            date: new Date(2026, 5, 2, 16, 30).toISOString()
          }
        ]
      },
      {
        id: 'rq-mock-5',
        item_number: 5,
        otm_id: null,
        otm_code: null,
        created_at: new Date(2026, 4, 25, 14, 20).toISOString(),
        supervisor_id: 'sup-1',
        supervisor_name: 'Diana Altamirano',
        type: 'supply',
        description: 'Filtro de arena de repuesto para mantenimiento de patera.',
        materials: [
          { name: 'Filtro de arena 24"', unit: 'Unidades', quantity: 1 }
        ],
        rq_number: 'RQ-10047',
        sap_number: null,
        status: 'rejected',
        status_dates: {
          in_approval: new Date(2026, 4, 25, 14, 20).toISOString(),
          rejected: new Date(2026, 4, 26, 11, 15).toISOString()
        },
        observations: [
          {
            id: 'obs-mock-5',
            text: 'Rechazado debido a que se utilizará el stock excedente de la sede Chorrillos.',
            date: new Date(2026, 4, 26, 12, 0).toISOString()
          }
        ]
      }
    ];
  };

  const [rqs, setRqs] = useState<RQRecord[]>(() => {
    const saved = localStorage.getItem('demo_rqs_v2');
    return saved ? JSON.parse(saved) : getInitialRqs();
  });

  useEffect(() => {
    localStorage.setItem('demo_rqs_v2', JSON.stringify(rqs));
  }, [rqs]);

  const getRQById = useCallback((id: string) => {
    return rqs.find(r => r.id === id);
  }, [rqs]);

  const getRQByOtmId = useCallback((otmId: string) => {
    return rqs.find(r => r.otm_id === otmId);
  }, [rqs]);

  const createRQRecord = useCallback((data: Omit<RQRecord, 'id' | 'item_number' | 'created_at' | 'status' | 'status_dates'>) => {
    const newId = `rq-${Date.now()}`;
    const nextNumber = rqs.length > 0 ? Math.max(...rqs.map(r => r.item_number)) + 1 : 1;
    
    const newRecord: RQRecord = {
      ...data,
      id: newId,
      item_number: nextNumber,
      created_at: new Date().toISOString(),
      status: 'in_approval',
      status_dates: {
        in_approval: new Date().toISOString()
      },
      observations: data.observations || []
    };

    setRqs(prev => [newRecord, ...prev]);

    // If linked to OTM, we update the OTM status/fields to keep them synced
    if (data.otm_id) {
      const materialsText = data.materials ? data.materials.map(m => m.name).join(', ') : '';
      const qtyText = data.materials ? data.materials.map(m => `${m.quantity} ${m.unit}`).join(', ') : '';
      
      updateOTMFields(data.otm_id, {
        rq_type: data.type,
        rq_date: newRecord.created_at,
        rq_materials: data.type === 'supply' ? materialsText : null,
        rq_quantities: data.type === 'supply' ? qtyText : null,
        rq_service_desc: data.type === 'service' ? data.description : null,
        status: 'rq'
      });
    }

    return newRecord;
  }, [rqs, updateOTMFields]);

  const updateRQRecord = useCallback((id: string, fields: Partial<RQRecord>) => {
    setRqs(prev => prev.map(r => {
      if (r.id !== id) return r;
      
      let updatedStatus = r.status;
      let updatedDates = { ...r.status_dates };
      let updatedObservations = r.observations ? [...r.observations] : [];

      // Auto-transition to in_logistics if sap_number is set
      if (fields.sap_number !== undefined && fields.sap_number !== null) {
        const hasSap = fields.sap_number.trim() !== '';
        if (hasSap && r.status === 'in_approval') {
          updatedStatus = 'in_logistics';
          updatedDates = { ...updatedDates, in_logistics: new Date().toISOString() };
          updatedObservations.push({
            id: `obs-sys-${Date.now()}`,
            text: `N° SAP registrado: ${fields.sap_number.trim()}. Requerimiento derivado a logística.`,
            date: new Date().toISOString()
          });
        }
      }

      const updated = { 
        ...r, 
        ...fields,
        status: updatedStatus,
        status_dates: updatedDates,
        observations: updatedObservations
      };
      
      // Sync fields to linked OTM if relevant
      if (updated.otm_id) {
        const syncFields: any = {};
        if (Object.keys(syncFields).length > 0) {
          updateOTMFields(updated.otm_id, syncFields);
        }
      }

      return updated;
    }));
  }, [updateOTMFields]);

  const updateRQStatus = useCallback((id: string, status: RQStatus, observations?: string) => {
    setRqs(prev => prev.map(r => {
      if (r.id !== id) return r;

      const updatedDates = { ...r.status_dates, [status]: new Date().toISOString() };
      const updatedObservations = r.observations ? [...r.observations] : [];
      if (observations && observations.trim()) {
        updatedObservations.push({
          id: `obs-${Date.now()}`,
          text: observations.trim(),
          date: new Date().toISOString()
        });
      }

      const updated: RQRecord = {
        ...r,
        status,
        status_dates: updatedDates,
        observations: updatedObservations
      };

      // Bidirectional sync with OTM status if linked
      if (r.otm_id) {
        if (status === 'rejected') {
          updateOTMStatus(r.otm_id, 'pending', `RQ Rechazado: ${observations || ''}`);
        }
      }

      return updated;
    }));
  }, [updateOTMStatus]);

  return (
    <RQContext.Provider value={{
      rqs,
      getRQById,
      getRQByOtmId,
      createRQRecord,
      updateRQRecord,
      updateRQStatus
    }}>
      {children}
    </RQContext.Provider>
  );
}

export function useRQ() {
  const context = useContext(RQContext);
  if (!context) {
    throw new Error('useRQ must be used within an RQProvider');
  }
  return context;
}
