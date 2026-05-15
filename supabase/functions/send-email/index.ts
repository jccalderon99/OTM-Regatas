// Supabase Edge Function: Send closure email
// Deploy: supabase functions deploy send-email
// Only called when an OTM reaches CLOSED status (zero-noise policy)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { otm_code, requester_email, html_content } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured. Email skipped.');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped - no API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OTM Sistema <otm@yourdomain.com>',
        to: [requester_email],
        subject: `[OTM CERRADA] ${otm_code} - Orden de Trabajo Completada`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a365d, #2563eb); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">🔧 OTM Sistema</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Orden de Trabajo Completada</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a365d; margin-top: 0;">✅ ${otm_code}</h2>
              <p style="color: #64748b; font-size: 14px;">
                La orden de trabajo ha sido cerrada exitosamente con la conformidad del solicitante.
                Adjunto encontrará el documento completo con todos los detalles.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                Este es un correo automático generado por el Sistema OTM.
                Este es el único correo enviado durante todo el proceso (Política Zero-Noise).
              </p>
            </div>
          </div>
        `,
      }),
    });

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
