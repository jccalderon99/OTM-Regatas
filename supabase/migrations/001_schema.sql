-- OTM System Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('requester', 'supervisor', 'technician')),
  area_sector TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'requester')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- AREAS (lookup)
-- =============================================
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true
);

INSERT INTO areas (name, description) VALUES
  ('Producción', 'Línea de producción principal'),
  ('Almacén', 'Almacén de materias primas y producto terminado'),
  ('Oficinas Administrativas', 'Oficinas del personal administrativo'),
  ('Laboratorio', 'Laboratorio de calidad'),
  ('Mantenimiento', 'Taller de mantenimiento'),
  ('Comedor', 'Área de comedor y cocina'),
  ('Estacionamiento', 'Estacionamiento general'),
  ('Área Externa', 'Áreas exteriores y jardines'),
  ('Recepción', 'Recepción y lobby'),
  ('Sala de Reuniones', 'Salas de reuniones')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- OTM REQUESTS (main work orders)
-- =============================================
CREATE TABLE IF NOT EXISTS otm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_code TEXT UNIQUE NOT NULL,
  requester_id UUID NOT NULL REFERENCES profiles(id),
  requester_name TEXT NOT NULL,
  area_sector TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  asset TEXT,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  location TEXT,
  supervisor_id UUID REFERENCES profiles(id),
  supervisor_notes TEXT,
  scheduled_date TIMESTAMPTZ,
  technician_id UUID REFERENCES profiles(id),
  technician_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'in_progress', 'awaiting_conformity', 'closed', 'cancelled')),
  conformity_rating INTEGER CHECK (conformity_rating BETWEEN 1 AND 5),
  conformity_notes TEXT,
  conformity_signature_url TEXT,
  conformity_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Auto-generate OTM code
CREATE OR REPLACE FUNCTION generate_otm_code()
RETURNS TRIGGER AS $$
DECLARE
  seq INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM otm_requests
    WHERE DATE(created_at) = DATE(now());
  NEW.otm_code := 'OTM-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_otm_code
  BEFORE INSERT ON otm_requests
  FOR EACH ROW
  WHEN (NEW.otm_code IS NULL OR NEW.otm_code = '')
  EXECUTE FUNCTION generate_otm_code();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_otm_timestamp
  BEFORE UPDATE ON otm_requests
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =============================================
-- STATUS LOG (audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS otm_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_id UUID NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ATTACHMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS otm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otm_id UUID NOT NULL REFERENCES otm_requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('before_photo', 'after_photo', 'document', 'other')),
  phase TEXT CHECK (phase IN ('request', 'execution', 'conformity')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_otm_status ON otm_requests(status);
CREATE INDEX IF NOT EXISTS idx_otm_area ON otm_requests(area_sector);
CREATE INDEX IF NOT EXISTS idx_otm_requester ON otm_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_otm_technician ON otm_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_otm_created ON otm_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_log_otm ON otm_status_log(otm_id);
CREATE INDEX IF NOT EXISTS idx_attachments_otm ON otm_attachments(otm_id);
