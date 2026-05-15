// Supabase Edge Function: Generate PDF for closed OTMs
// Deploy: supabase functions deploy generate-pdf
// Trigger: Database webhook on otm_requests UPDATE where status = 'closed'

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { otm_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch complete OTM data
    const { data: otm, error } = await supabase
      .from('otm_requests')
      .select('*')
      .eq('id', otm_id)
      .single();

    if (error || !otm) {
      throw new Error(`OTM not found: ${error?.message}`);
    }

    // Fetch status history
    const { data: logs } = await supabase
      .from('otm_status_log')
      .select('*, changed_by_profile:profiles!changed_by(full_name)')
      .eq('otm_id', otm_id)
      .order('created_at', { ascending: true });

    // Fetch attachments
    const { data: attachments } = await supabase
      .from('otm_attachments')
      .select('*')
      .eq('otm_id', otm_id);

    // Build HTML document for PDF conversion
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; margin: 40px; }
    h1 { font-size: 18pt; color: #1a365d; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; }
    h2 { font-size: 13pt; color: #2563eb; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 6px 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 10pt; }
    th { background: #f1f5f9; font-weight: 600; width: 35%; }
    .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
    .timeline-item { padding: 4px 0; font-size: 9pt; border-left: 2px solid #3b82f6; padding-left: 12px; margin: 4px 0; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; padding-top: 4px; font-size: 9pt; }
    .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>ORDEN DE TRABAJO DE MANTENIMIENTO</h1>
  <div style="margin-bottom: 20px;">
    <strong style="font-size: 14pt; color: #3b82f6;">${otm.otm_code}</strong>
    <span style="float: right; font-size: 10pt; color: #64748b;">Generado: ${new Date().toLocaleString('es')}</span>
  </div>

  <h2>1. Datos de la Solicitud</h2>
  <table>
    <tr><th>Solicitante</th><td>${otm.requester_name}</td></tr>
    <tr><th>Área / Sector</th><td>${otm.area_sector}</td></tr>
    <tr><th>Tipo de Falla</th><td>${otm.failure_type}</td></tr>
    <tr><th>Activo / Equipo</th><td>${otm.asset || 'N/A'}</td></tr>
    <tr><th>Ubicación</th><td>${otm.location || 'N/A'}</td></tr>
    <tr><th>Urgencia</th><td>${otm.urgency.toUpperCase()}</td></tr>
    <tr><th>Fecha de Solicitud</th><td>${new Date(otm.created_at).toLocaleString('es')}</td></tr>
  </table>

  <h2>2. Descripción del Problema</h2>
  <p>${otm.description}</p>

  <h2>3. Supervisión</h2>
  <table>
    <tr><th>Fecha Programada</th><td>${otm.scheduled_date ? new Date(otm.scheduled_date).toLocaleString('es') : 'N/A'}</td></tr>
    <tr><th>Notas del Supervisor</th><td>${otm.supervisor_notes || 'N/A'}</td></tr>
  </table>

  <h2>4. Ejecución Técnica</h2>
  <table>
    <tr><th>Notas del Técnico</th><td>${otm.technician_notes || 'N/A'}</td></tr>
  </table>

  <h2>5. Historial de Estados</h2>
  ${(logs || []).map((l: any) => `
    <div class="timeline-item">
      <strong>${l.new_status.toUpperCase()}</strong> — ${new Date(l.created_at).toLocaleString('es')}
      ${l.notes ? `<br/><em>${l.notes}</em>` : ''}
    </div>
  `).join('')}

  <h2>6. Conformidad del Servicio</h2>
  <table>
    <tr><th>Calificación</th><td>${'★'.repeat(otm.conformity_rating || 0)}${'☆'.repeat(5 - (otm.conformity_rating || 0))} (${otm.conformity_rating}/5)</td></tr>
    <tr><th>Observaciones</th><td>${otm.conformity_notes || 'N/A'}</td></tr>
    <tr><th>Fecha de Cierre</th><td>${otm.closed_at ? new Date(otm.closed_at).toLocaleString('es') : 'N/A'}</td></tr>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 40px;">
    <div class="signature-line">Firma Solicitante</div>
    <div class="signature-line">Firma Supervisor</div>
    <div class="signature-line">Firma Técnico</div>
  </div>

  <div class="footer">
    Documento generado automáticamente por el Sistema OTM — ${new Date().toLocaleString('es')}
  </div>
</body>
</html>`;

    // Store HTML as the PDF template (in production, use a PDF rendering service)
    const pdfBlob = new Blob([htmlContent], { type: 'text/html' });
    const filePath = `otm-pdfs/${otm.otm_code}.html`;

    const { error: uploadError } = await supabase.storage
      .from('otm-attachments')
      .upload(filePath, pdfBlob, { contentType: 'text/html', upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    // Trigger email function
    const emailRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          otm_id: otm.id,
          otm_code: otm.otm_code,
          requester_email: (await supabase.from('profiles').select('email').eq('id', otm.requester_id).single()).data?.email,
          html_content: htmlContent,
        }),
      }
    );

    return new Response(
      JSON.stringify({ success: true, otm_code: otm.otm_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
