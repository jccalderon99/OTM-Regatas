import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const text = url.searchParams.get('text') || req.query?.text || (req.body && req.body.text);
    const voice = url.searchParams.get('voice') || req.query?.voice || (req.body && req.body.voice) || 'es-PE-CamilaNeural';

    if (!text || typeof text !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Parametro text requerido' }));
      return;
    }

    const cleanText = text.slice(0, 1000);
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanText);

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    });

    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => {
      try { tts.close(); } catch(e) {}
      res.end(Buffer.concat(chunks));
    });
    audioStream.on('error', (err) => {
      console.error('Edge-TTS stream error:', err);
      try { tts.close(); } catch(e) {}
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error generando audio' }));
      }
    });
  } catch (error) {
    console.error('TTS handler error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error?.message || 'Error interno' }));
    }
  }
}
