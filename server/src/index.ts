import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createClient } from '@supabase/supabase-js';
import type { MiddlewareHandler } from 'hono';
import { sendPush } from './apns';

const app = new Hono();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const auth: MiddlewareHandler = async (c, next) => {
  if (c.req.header('x-api-key') !== process.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

// ── Health (no auth — useful for Railway health checks) ──────────────────────
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ── Temporary APNs config debug (no auth — remove after confirming it works) ─
app.get('/debug-apns', (c) => {
  const key = process.env.APNS_KEY ?? '';
  const decoded = key.startsWith('-----')
    ? key
    : Buffer.from(key, 'base64').toString('utf8');
  return c.json({
    APNS_KEY_ID:     process.env.APNS_KEY_ID     ?? 'NOT SET',
    APNS_TEAM_ID:    process.env.APNS_TEAM_ID    ?? 'NOT SET',
    APNS_BUNDLE_ID:  process.env.APNS_BUNDLE_ID  ?? 'NOT SET',
    APNS_PRODUCTION: process.env.APNS_PRODUCTION ?? 'NOT SET',
    APNS_KEY_format: decoded.startsWith('-----BEGIN') ? 'valid PEM' : 'INVALID',
    APNS_KEY_length: key.length,
  });
});

// ── Register device token (called by iOS app on every launch) ────────────────
app.post('/register', auth, async (c) => {
  const { token, device_name } = await c.req.json<{ token: string; device_name?: string }>();
  if (!token) return c.json({ error: 'token is required' }, 400);

  await supabase
    .from('devices')
    .upsert({ token, device_name, updated_at: new Date().toISOString() }, { onConflict: 'token' });

  console.log(`[register] device="${device_name}" token=${token.slice(0, 8)}…`);
  return c.json({ ok: true });
});

// ── Send a push notification ─────────────────────────────────────────────────
//
//   POST /push
//   x-api-key: <your key>
//   { "title": "BTC Signal", "body": "BUY at $95k", "data": { ... } }
//
app.post('/push', auth, async (c) => {
  const { title, body, data } = await c.req.json<{
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>();

  if (!title || !body) return c.json({ error: 'title and body are required' }, 400);

  // Look up the most recently registered device
  const { data: device } = await supabase
    .from('devices')
    .select('token')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!device?.token) {
    return c.json({ error: 'No device registered — open the iOS app first' }, 404);
  }

  const result = await sendPush(device.token, { title, body, data });

  // Log every attempt
  await supabase.from('notifications').insert({
    title,
    body,
    data: data ?? null,
    status: result.ok ? 'sent' : 'failed',
    error: result.error ?? null,
  });

  if (!result.ok) {
    console.error(`[push] failed: ${result.error}`);
    return c.json({ ok: false, error: result.error }, 500);
  }

  console.log(`[push] sent "${title}"`);
  return c.json({ ok: true });
});

// ── Recent notification log ───────────────────────────────────────────────────
app.get('/notifications', auth, async (c) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ── Registered device info ────────────────────────────────────────────────────
app.get('/device', auth, async (c) => {
  const { data } = await supabase
    .from('devices')
    .select('device_name, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return c.json({ registered: false });
  return c.json({ registered: true, device_name: data.device_name, updated_at: data.updated_at });
});

serve(
  { fetch: app.fetch, port: Number(process.env.PORT ?? 3000) },
  (info) => console.log(`Push server listening on :${info.port}`),
);
