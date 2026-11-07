// Edge Function — conta visitantes únicos por hash de IP
// Roda no servidor Vercel; o browser chama GET /api/ping

export const config = { runtime: 'edge' };

const SB_URL = 'https://eltjhrhrtuymejojxyhe.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdGpocmhydHV5bWVqb2p4eWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDUxODcsImV4cCI6MjA5NjAyMTE4N30.cEgQrQ-Svr61s2O9JTLytqHEL8BpPYZWjS6ZCrAop58';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
           || req.headers.get('x-real-ip')
           || 'unknown';

  const hash = await sha256(ip + 'montgomery-radio-salt');

  // Upsert: se hash já existe, incrementa visit_count e atualiza last_seen
  const upsertRes = await fetch(`${SB_URL}/rest/v1/visitors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      ip_hash: hash,
      last_seen: new Date().toISOString(),
      visit_count: 1,
    }),
  });

  if (!upsertRes.ok) {
    return new Response(JSON.stringify({ error: 'db error' }), { status: 500 });
  }

  // Busca total de visitantes únicos
  const countRes = await fetch(`${SB_URL}/rest/v1/visitors?select=count`, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });

  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);

  return new Response(JSON.stringify({ total }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
