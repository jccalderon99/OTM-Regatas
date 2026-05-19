-- ============================================================
-- OTM-REGATAS: Migración Inicial — Schema Completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES (Usuarios del sistema)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'requester'
    CHECK (role IN ('requester','supervisor','technician','jefatura','admin')),
  area_sector text,
  position text,
  phone text,
  avatar_url text,
  jefatura_name text,
  jefatura_position text,
  jefatura_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. OTM_REQUESTS (Órdenes de Trabajo de Mantenimiento)
CREATE TABLE IF NOT EXISTS otm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_code text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES profiles(id),
  requester_name text NOT NULL,
  area_sector text NOT NULL,
  exact_location text,
  failure_type text NOT NULL,
  asset text,
  description text NOT NULL,
  urgency text NOT NULL DEFAULT 'medium'
    CHECK (urgency IN ('low','medium','high')),
  location text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scheduled','in_progress','rq',
      'awaiting_supervisor','awaiting_conformity','closed','cancelled')),
  maintenance_type text
    CHECK (maintenance_type IS NULL OR maintenance_type IN ('corrective','preventive','emergency','support')),
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_notes text,
  scheduled_date timestamptz,
  technician_id uuid REFERENCES profiles(id),
  technician_notes text,
  job_start_time timestamptz,
  job_end_time timestamptz,
  assignment_type text
    CHECK (assignment_type IS NULL OR assignment_type IN ('own','contractor')),
  contractor_name text,
  contractor_date timestamptz,
  contractor_detail text,
  rq_type text
    CHECK (rq_type IS NULL OR rq_type IN ('supply','service')),
  rq_date timestamptz,
  rq_materials text,
  rq_quantities text,
  rq_service_desc text,
  rq_magnitude text
    CHECK (rq_magnitude IS NULL OR rq_magnitude IN ('puntual','integral')),
  cancellation_reason text
    CHECK (cancellation_reason IS NULL OR cancellation_reason IN ('not_maintenance','wrong_request','duplicate','other')),
  cancellation_detail text,
  conformity_rating smallint
    CHECK (conformity_rating IS NULL OR (conformity_rating BETWEEN 1 AND 5)),
  conformity_notes text,
  conformity_signature_url text,
  conformity_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

-- 3. OTM_STATUS_LOGS (Historial de cambios de estado)
CREATE TABLE IF NOT EXISTS otm_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_id uuid NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. OTM_ATTACHMENTS (Archivos adjuntos / Fotos)
CREATE TABLE IF NOT EXISTS otm_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_id uuid NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text
    CHECK (file_type IS NULL OR file_type IN ('before_photo','after_photo','document','other')),
  phase text
    CHECK (phase IS NULL OR phase IN ('request','execution','conformity')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. MASTER_DATA (Áreas, Especialidades, Ubicaciones)
CREATE TABLE IF NOT EXISTS master_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('area','specialty','location')),
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, name)
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_otm_status ON otm_requests(status);
CREATE INDEX IF NOT EXISTS idx_otm_urgency ON otm_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_otm_requester ON otm_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_otm_supervisor ON otm_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_otm_technician ON otm_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_otm_created ON otm_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_otm ON otm_status_logs(otm_id);
CREATE INDEX IF NOT EXISTS idx_attachments_otm ON otm_attachments(otm_id);
CREATE INDEX IF NOT EXISTS idx_master_type ON master_data(type, active);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_otm_updated
  BEFORE UPDATE ON otm_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

-- Profiles: todos leen, admin administra
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- OTM Requests
CREATE POLICY "otm_select" ON otm_requests FOR SELECT USING (true);
CREATE POLICY "otm_insert" ON otm_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "otm_update" ON otm_requests FOR UPDATE USING (true);

-- Status Logs
CREATE POLICY "logs_select" ON otm_status_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON otm_status_logs FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Attachments
CREATE POLICY "attachments_select" ON otm_attachments FOR SELECT USING (true);
CREATE POLICY "attachments_insert" ON otm_attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Master Data: todos leen, admin administra
CREATE POLICY "master_select" ON master_data FOR SELECT USING (true);
CREATE POLICY "master_insert" ON master_data FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "master_update" ON master_data FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "master_delete" ON master_data FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
