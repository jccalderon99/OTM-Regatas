-- ============================================================
-- OTM-REGATAS: Migración 004 — Múltiples Técnicos Asignados
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Crear tabla intermedia para la relación N:M entre OTMs y Técnicos
CREATE TABLE IF NOT EXISTS otm_technicians (
  otm_id uuid NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (otm_id, technician_id)
);

-- 2. Crear índices para mejorar velocidad de consultas
CREATE INDEX IF NOT EXISTS idx_otm_technicians_otm ON otm_technicians(otm_id);
CREATE INDEX IF NOT EXISTS idx_otm_technicians_tech ON otm_technicians(technician_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE otm_technicians ENABLE ROW LEVEL SECURITY;

-- 4. Establecer políticas de seguridad simplificadas (consistentes con las existentes)
CREATE POLICY "otm_technicians_select" ON otm_technicians FOR SELECT USING (true);
CREATE POLICY "otm_technicians_insert" ON otm_technicians FOR INSERT WITH CHECK (true);
CREATE POLICY "otm_technicians_update" ON otm_technicians FOR UPDATE USING (true);
CREATE POLICY "otm_technicians_delete" ON otm_technicians FOR DELETE USING (true);

-- 5. Migrar asignaciones existentes (copiar de otm_requests.technician_id a otm_technicians)
INSERT INTO otm_technicians (otm_id, technician_id)
SELECT id, technician_id
FROM otm_requests
WHERE technician_id IS NOT NULL
ON CONFLICT DO NOTHING;
