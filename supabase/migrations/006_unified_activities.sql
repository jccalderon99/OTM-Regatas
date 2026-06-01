-- ============================================================
-- OTM-REGATAS: Migración 006 — Estructura y Vista de Actividades Unificada
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Crear tabla para OTIs (si no existía en base de datos real)
CREATE TABLE IF NOT EXISTS otis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oti_code text UNIQUE NOT NULL,
  supervisor_id uuid NOT NULL REFERENCES profiles(id),
  supervisor_name text NOT NULL,
  location text NOT NULL,
  exact_location text,
  description text NOT NULL,
  specialty text NOT NULL,
  scheduled_date timestamptz NOT NULL,
  estimated_time numeric, -- En horas
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Crear tabla intermedia para múltiples técnicos en OTIs
CREATE TABLE IF NOT EXISTS oti_technicians (
  oti_id uuid NOT NULL REFERENCES otis(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (oti_id, technician_id)
);

CREATE INDEX IF NOT EXISTS idx_oti_technicians_oti ON oti_technicians(oti_id);
CREATE INDEX IF NOT EXISTS idx_oti_technicians_tech ON oti_technicians(technician_id);

-- Habilitar RLS en nuevas tablas
ALTER TABLE otis ENABLE ROW LEVEL SECURITY;
ALTER TABLE oti_technicians ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS simplificadas
CREATE POLICY "otis_select" ON otis FOR SELECT USING (true);
CREATE POLICY "otis_insert" ON otis FOR INSERT WITH CHECK (true);
CREATE POLICY "otis_update" ON otis FOR UPDATE USING (true);
CREATE POLICY "otis_delete" ON otis FOR DELETE USING (true);

CREATE POLICY "oti_technicians_select" ON oti_technicians FOR SELECT USING (true);
CREATE POLICY "oti_technicians_insert" ON oti_technicians FOR INSERT WITH CHECK (true);
CREATE POLICY "oti_technicians_update" ON oti_technicians FOR UPDATE USING (true);
CREATE POLICY "oti_technicians_delete" ON oti_technicians FOR DELETE USING (true);

-- 3. Crear VISTA SQL Unificada de Actividades (OTM, OTI y Rutinarias)
CREATE OR REPLACE VIEW view_unified_activities AS
-- A. Órdenes de Trabajo de Mantenimiento (OTM)
SELECT
  id AS activity_id,
  otm_code AS code,
  'OTM' AS activity_type,
  description AS description,
  failure_type AS specialty,
  location AS location,
  exact_location AS exact_location,
  (
    SELECT string_agg(p.full_name, ', ')
    FROM otm_technicians ot
    JOIN profiles p ON p.id = ot.technician_id
    WHERE ot.otm_id = otm_requests.id
  ) AS technician_names,
  (SELECT full_name FROM profiles WHERE id = supervisor_id) AS supervisor_name,
  created_at::date AS record_date,
  job_start_time AS start_time,
  job_end_time AS end_time,
  COALESCE(net_execution_time, 0) AS execution_time_minutes,
  status AS status
FROM otm_requests

UNION ALL

-- B. Órdenes de Trabajo Internas (OTI)
SELECT
  o.id AS activity_id,
  o.oti_code AS code,
  'OTI' AS activity_type,
  o.description AS description,
  o.specialty AS specialty,
  o.location AS location,
  o.exact_location AS exact_location,
  (
    SELECT string_agg(p.full_name, ', ')
    FROM oti_technicians ot
    JOIN profiles p ON p.id = ot.technician_id
    WHERE ot.oti_id = o.id
  ) AS technician_names,
  o.supervisor_name AS supervisor_name,
  o.scheduled_date::date AS record_date,
  o.scheduled_date AS start_time,
  CASE WHEN o.status = 'completed' THEN o.scheduled_date + (COALESCE(o.estimated_time, 1) || ' hours')::interval ELSE NULL END AS end_time,
  COALESCE(o.estimated_time * 60, 0)::integer AS execution_time_minutes,
  o.status AS status
FROM otis o

UNION ALL

-- C. Registros de Actividades Rutinarias (Routine Records)
SELECT
  r.id AS activity_id,
  'RUT-' || SUBSTRING(r.id::text FROM 1 FOR 8) AS code,
  'RUTINARIA' AS activity_type,
  r.specialty || ' - ' || r.sub_specialty || ': ' || array_to_string(r.activities_executed, ', ') || COALESCE(' (' || r.free_text_activity || ')', '') AS description,
  r.specialty AS specialty,
  CASE 
    WHEN r.specialty = 'Piscina' THEN '031. Piscina Olimpica y Patera'
    WHEN r.specialty = 'Calderos' THEN '017. Edificio de servicios'
    ELSE '056. Polideportivo - al exterior del Club'
  END AS location,
  r.sub_specialty AS exact_location,
  (SELECT full_name FROM profiles WHERE id = r.technician_id) AS technician_names,
  'Sistema' AS supervisor_name,
  r.record_date AS record_date,
  (r.record_date::text || ' ' || r.start_time || ':00')::timestamptz AS start_time,
  (r.record_date::text || ' ' || r.end_time || ':00')::timestamptz AS end_time,
  (
    EXTRACT(EPOCH FROM ((r.record_date::text || ' ' || r.end_time || ':00')::timestamptz - (r.record_date::text || ' ' || r.start_time || ':00')::timestamptz)) / 60
  )::integer AS execution_time_minutes,
  'completed' AS status
FROM routine_records r;
