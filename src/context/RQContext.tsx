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
        status: 'review',
        status_dates: {
          review: new Date(2026, 4, 22, 9, 30).toISOString()
        },
        observations: 'A la espera del ingreso del nro de RQ por logística.'
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
        status: 'approved',
        status_dates: {
          review: new Date(2026, 4, 23, 10, 15).toISOString(),
          approved: new Date(2026, 4, 23, 15, 30).toISOString()
        },
        observations: 'Cotización aprobada por jefatura. SAP generado.'
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
          review: new Date(2026, 4, 24, 11, 0).toISOString(),
          approved: new Date(2026, 4, 24, 14, 0).toISOString(),
          in_logistics: new Date(2026, 4, 25, 9, 0).toISOString()
        },
        observations: 'En proceso de cotización por el área de Logística.'
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
          review: new Date(2026, 4, 25, 8, 45).toISOString(),
          approved: new Date(2026, 4, 25, 12, 0).toISOString(),
          in_logistics: new Date(2026, 4, 26, 10, 0).toISOString(),
          attended: new Date(2026, 5, 2, 16, 0).toISOString()
        },
        observations: 'Servicio culminado al 100%. Acta de conformidad firmada.'
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
          review: new Date(2026, 4, 25, 14, 20).toISOString(),
          rejected: new Date(2026, 4, 26, 11, 15).toISOString()
        },
        observations: 'Rechazado debido a que se utilizará el stock excedente de la sede Chorrillos.'
      }
    ];
  };

  const [rqs, setRqs] = useState<RQRecord[]>(() => {
    const saved = localStorage.getItem('demo_rqs_v1');
    return saved ? JSON.parse(saved) : getInitialRqs();
  });

  useEffect(() => {
    localStorage.setItem('demo_rqs_v1', JSON.stringify(rqs));
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
      status: 'review',
      status_dates: {
        review: new Date().toISOString()
      }
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
      
      const updated = { ...r, ...fields };
      
      // Sync fields to linked OTM if relevant
      if (updated.otm_id) {
        const syncFields: any = {};
        if (fields.rq_number !== undefined) {
          // If we have an RQ number, we can add it to the OTM details if we want
        }
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
      const updated: RQRecord = {
        ...r,
        status,
        status_dates: updatedDates,
        observations: observations !== undefined ? observations : r.observations
      };

      // Bidirectional sync with OTM status if linked
      if (r.otm_id) {
        if (status === 'rejected') {
          // If the requirement is rejected, what happens to OTM?
          // It might go back to 'pending' or stay in 'rq' depending on supervisor decision.
          // Let's keep it linked but let the user know. Or we can reset OTM status to pending so it can be re-assigned.
          updateOTMStatus(r.otm_id, 'pending', `RQ Rechazado: ${observations || ''}`);
        } else if (status === 'attended') {
          // If attended, the materials are ready, the OTM can go back to 'scheduled' or 'pending' for work execution.
          // Let's put OTM in 'pending' or 'scheduled' so they can execute.
          // Actually, let's keep status 'rq' but log that it was attended, or supervisor can re-assign.
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
