-- OTM Row-Level Security Policies
-- Run after 001_schema.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE otm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES RLS
-- =============================================
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Supervisors can read all profiles"
  ON profiles FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- OTM REQUESTS RLS
-- =============================================

-- Requesters: ONLY see OTMs from their own area_sector
CREATE POLICY "requester_read_own_area"
  ON otm_requests FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'requester'
    AND area_sector = (SELECT area_sector FROM profiles WHERE id = auth.uid())
  );

-- Requesters: can create OTMs
CREATE POLICY "requester_create"
  ON otm_requests FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'requester'
    AND requester_id = auth.uid()
  );

-- Requesters: can update only conformity fields on their area OTMs
CREATE POLICY "requester_update_conformity"
  ON otm_requests FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'requester'
    AND area_sector = (SELECT area_sector FROM profiles WHERE id = auth.uid())
    AND status = 'awaiting_conformity'
  );

-- Supervisors: full read access
CREATE POLICY "supervisor_read_all"
  ON otm_requests FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- Supervisors: can update any OTM
CREATE POLICY "supervisor_update"
  ON otm_requests FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
  );

-- Technicians: see only assigned OTMs
CREATE POLICY "technician_read_assigned"
  ON otm_requests FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    AND technician_id = auth.uid()
  );

-- Technicians: update only assigned OTMs
CREATE POLICY "technician_update_assigned"
  ON otm_requests FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    AND technician_id = auth.uid()
  );

-- =============================================
-- STATUS LOG RLS
-- =============================================
CREATE POLICY "Anyone can read status logs for accessible OTMs"
  ON otm_status_log FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM otm_requests
      WHERE otm_requests.id = otm_status_log.otm_id
    )
  );

CREATE POLICY "Authenticated users can insert logs"
  ON otm_status_log FOR INSERT WITH CHECK (
    auth.uid() = changed_by
  );

-- =============================================
-- ATTACHMENTS RLS
-- =============================================
CREATE POLICY "Read attachments for accessible OTMs"
  ON otm_attachments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM otm_requests
      WHERE otm_requests.id = otm_attachments.otm_id
    )
  );

CREATE POLICY "Upload attachments"
  ON otm_attachments FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
  );

-- =============================================
-- AREAS RLS (public read)
-- =============================================
CREATE POLICY "Anyone can read areas"
  ON areas FOR SELECT USING (true);

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('otm-attachments', 'otm-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'otm-attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated read"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'otm-attachments' AND auth.role() = 'authenticated'
  );
