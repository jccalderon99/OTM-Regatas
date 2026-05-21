-- ============================================================
-- OTM-REGATAS: Migración 005 — Actividades Rutinarias
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS routine_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty text NOT NULL,
  sub_specialty text NOT NULL,
  activity text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty text NOT NULL,
  sub_specialty text NOT NULL,
  activities_executed text[] NOT NULL DEFAULT '{}',
  free_text_activity text,
  record_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_activities_spec ON routine_activities(specialty, sub_specialty);
CREATE INDEX IF NOT EXISTS idx_routine_records_date ON routine_records(record_date);
CREATE INDEX IF NOT EXISTS idx_routine_records_tech ON routine_records(technician_id);

ALTER TABLE routine_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routine_activities_select" ON routine_activities FOR SELECT USING (true);
CREATE POLICY "routine_activities_insert" ON routine_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "routine_activities_update" ON routine_activities FOR UPDATE USING (true);
CREATE POLICY "routine_activities_delete" ON routine_activities FOR DELETE USING (true);

CREATE POLICY "routine_records_select" ON routine_records FOR SELECT USING (true);
CREATE POLICY "routine_records_insert" ON routine_records FOR INSERT WITH CHECK (true);
CREATE POLICY "routine_records_update" ON routine_records FOR UPDATE USING (true);
CREATE POLICY "routine_records_delete" ON routine_records FOR DELETE USING (true);

-- Catálogo inicial (especialidades del requerimiento)
INSERT INTO routine_activities (specialty, sub_specialty, activity) VALUES
-- Calderos 40 BHP
('Calderos', 'Calderos 40 BHP', 'Inspección visual de manómetros y válvulas'),
('Calderos', 'Calderos 40 BHP', 'Control de presión y temperatura de operación'),
('Calderos', 'Calderos 40 BHP', 'Purga de condensados y revisión de purgadores'),
('Calderos', 'Calderos 40 BHP', 'Verificación de nivel en vaso expansor'),
('Calderos', 'Calderos 40 BHP', 'Revisión de quemador y llama'),
('Calderos', 'Calderos 40 BHP', 'Limpieza de filtros y rejillas'),
('Calderos', 'Calderos 40 BHP', 'Registro de lecturas en bitácora'),
-- Piscina Olímpica (10 actividades)
('Piscina', 'Piscina Olímpica', 'Limpieza de cubetas y skimmers'),
('Piscina', 'Piscina Olímpica', 'Cepillado de paredes y fondo'),
('Piscina', 'Piscina Olímpica', 'Aspirado del fondo de piscina'),
('Piscina', 'Piscina Olímpica', 'Control de pH y cloro residual'),
('Piscina', 'Piscina Olímpica', 'Dosificación de químicos según protocolo'),
('Piscina', 'Piscina Olímpica', 'Limpieza y revisión de filtros'),
('Piscina', 'Piscina Olímpica', 'Revisión de bombas de circulación'),
('Piscina', 'Piscina Olímpica', 'Inspección de luminarias subacuáticas'),
('Piscina', 'Piscina Olímpica', 'Control de nivel de agua'),
('Piscina', 'Piscina Olímpica', 'Registro de lecturas en bitácora'),
-- Electricidad / Gasfitería
('Electricidad', 'General', 'Inspección de tableros eléctricos'),
('Electricidad', 'General', 'Revisión de breakers y conexiones'),
('Electricidad', 'General', 'Registro de novedades en bitácora'),
('Gasfitería', 'General', 'Revisión de llaves de paso principales'),
('Gasfitería', 'General', 'Inspección de fugas en baños y cocinas'),
('Gasfitería', 'General', 'Registro de novedades en bitácora'),
-- Jardinería
('Jardinería', 'Riego', 'Riego de áreas verdes programadas'),
('Jardinería', 'Riego', 'Registro de áreas regadas'),
('Jardinería', 'Podadura', 'Poda de setos y arbustos'),
('Jardinería', 'Podadura', 'Registro de áreas podadas')
;
