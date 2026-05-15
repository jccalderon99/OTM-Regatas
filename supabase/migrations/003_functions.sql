-- OTM RPC Functions for status transitions
-- Run after 002_rls.sql

-- Create OTM with auto-code
CREATE OR REPLACE FUNCTION create_otm(
  p_area_sector TEXT,
  p_failure_type TEXT,
  p_asset TEXT,
  p_description TEXT,
  p_urgency TEXT,
  p_location TEXT DEFAULT NULL
)
RETURNS otm_requests AS $$
DECLARE
  v_otm otm_requests;
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF v_profile.role != 'requester' THEN
    RAISE EXCEPTION 'Only requesters can create OTMs';
  END IF;

  INSERT INTO otm_requests (requester_id, requester_name, area_sector, failure_type, asset, description, urgency, location)
  VALUES (auth.uid(), v_profile.full_name, p_area_sector, p_failure_type, p_asset, p_description, p_urgency, p_location)
  RETURNING * INTO v_otm;

  INSERT INTO otm_status_log (otm_id, new_status, changed_by, notes)
  VALUES (v_otm.id, 'pending', auth.uid(), 'Solicitud creada');

  RETURN v_otm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign OTM to technician
CREATE OR REPLACE FUNCTION assign_otm(
  p_otm_id UUID,
  p_technician_id UUID,
  p_scheduled_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS otm_requests AS $$
DECLARE
  v_otm otm_requests;
  v_prev_status TEXT;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'supervisor' THEN
    RAISE EXCEPTION 'Only supervisors can assign OTMs';
  END IF;

  SELECT status INTO v_prev_status FROM otm_requests WHERE id = p_otm_id;

  UPDATE otm_requests SET
    technician_id = p_technician_id,
    supervisor_id = auth.uid(),
    scheduled_date = p_scheduled_date,
    supervisor_notes = COALESCE(p_notes, supervisor_notes),
    status = 'scheduled'
  WHERE id = p_otm_id
  RETURNING * INTO v_otm;

  INSERT INTO otm_status_log (otm_id, previous_status, new_status, changed_by, notes)
  VALUES (p_otm_id, v_prev_status, 'scheduled', auth.uid(), 'Asignado a técnico');

  RETURN v_otm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transition OTM status
CREATE OR REPLACE FUNCTION transition_otm_status(
  p_otm_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS otm_requests AS $$
DECLARE
  v_otm otm_requests;
  v_role TEXT;
  v_prev_status TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  SELECT status INTO v_prev_status FROM otm_requests WHERE id = p_otm_id;

  -- Validate transitions
  IF p_new_status = 'in_progress' AND v_prev_status != 'scheduled' THEN
    RAISE EXCEPTION 'Can only start work on scheduled OTMs';
  END IF;
  IF p_new_status = 'awaiting_conformity' AND v_prev_status != 'in_progress' THEN
    RAISE EXCEPTION 'Can only complete in-progress OTMs';
  END IF;
  IF p_new_status = 'cancelled' AND v_role != 'supervisor' THEN
    RAISE EXCEPTION 'Only supervisors can cancel OTMs';
  END IF;

  UPDATE otm_requests SET
    status = p_new_status,
    technician_notes = CASE WHEN v_role = 'technician' AND p_notes IS NOT NULL THEN p_notes ELSE technician_notes END,
    closed_at = CASE WHEN p_new_status IN ('closed', 'cancelled') THEN now() ELSE closed_at END
  WHERE id = p_otm_id
  RETURNING * INTO v_otm;

  INSERT INTO otm_status_log (otm_id, previous_status, new_status, changed_by, notes)
  VALUES (p_otm_id, v_prev_status, p_new_status, auth.uid(), p_notes);

  RETURN v_otm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit conformity
CREATE OR REPLACE FUNCTION submit_conformity(
  p_otm_id UUID,
  p_rating INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_signature_url TEXT DEFAULT NULL
)
RETURNS otm_requests AS $$
DECLARE
  v_otm otm_requests;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'requester' THEN
    RAISE EXCEPTION 'Only requesters can submit conformity';
  END IF;
  IF (SELECT status FROM otm_requests WHERE id = p_otm_id) != 'awaiting_conformity' THEN
    RAISE EXCEPTION 'OTM must be awaiting conformity';
  END IF;

  UPDATE otm_requests SET
    status = 'closed',
    conformity_rating = p_rating,
    conformity_notes = p_notes,
    conformity_signature_url = p_signature_url,
    conformity_date = now(),
    closed_at = now()
  WHERE id = p_otm_id
  RETURNING * INTO v_otm;

  INSERT INTO otm_status_log (otm_id, previous_status, new_status, changed_by, notes)
  VALUES (p_otm_id, 'awaiting_conformity', 'closed', auth.uid(), 'Conformidad registrada: ' || p_rating || '/5');

  -- The database webhook will trigger the PDF/email Edge Function
  RETURN v_otm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- KPI aggregation function
CREATE OR REPLACE FUNCTION get_kpi_data()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_requests', COUNT(*),
    'resolved', COUNT(*) FILTER (WHERE status = 'closed'),
    'avg_completion_hours', COALESCE(
      ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600) FILTER (WHERE closed_at IS NOT NULL)),
      0
    ),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'awaiting_conformity', COUNT(*) FILTER (WHERE status = 'awaiting_conformity'),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
  ) INTO v_result FROM otm_requests;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
