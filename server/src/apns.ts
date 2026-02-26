import { createSign } from 'crypto';
import * as http2 from 'http2';

// APNs JWT is valid for 1 hour. We cache it and refresh every 55 min.
let cachedToken: { value: string; createdAt: number } | null = null;

function buildJWT(keyId: string, teamId: string, privateKeyPEM: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const unsigned = `${header}.${payload}`;

  const sign = createSign('SHA256');
  sign.update(unsigned);
  // ieee-p1363 produces the raw R||S format JWT expects (not ASN.1 DER)
  const sig = sign.sign({ key: privateKeyPEM, dsaEncoding: 'ieee-p1363' }, 'base64url');

  return `${unsigned}.${sig}`;
}

function getToken(): string {
  const now = Date.now();
  if (cachedToken && now - cachedToken.createdAt < 55 * 60 * 1000) {
    return cachedToken.value;
  }

  // Support Railway-style escaped newlines in env vars
  const privateKey = (process.env.APNS_KEY ?? '').replace(/\\n/g, '\n');
  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;

  const value = buildJWT(keyId, teamId, privateKey);
  cachedToken = { value, createdAt: now };
  return value;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function sendPush(
  deviceToken: string,
  { title, body, data }: PushPayload,
): Promise<{ ok: boolean; error?: string }> {
  const production = process.env.APNS_PRODUCTION === 'true';
  const host = production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
  const bundleId = process.env.APNS_BUNDLE_ID ?? 'com.koshish.push';

  const apsPayload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default' },
    ...(data ?? {}),
  });

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);

    client.on('error', (err) => {
      client.destroy();
      resolve({ ok: false, error: err.message });
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${getToken()}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(apsPayload)),
    });

    req.write(apsPayload);
    req.end();

    let status = 0;
    let responseBody = '';

    req.on('response', (headers) => {
      status = headers[':status'] as number;
    });
    req.on('data', (chunk) => { responseBody += chunk; });
    req.on('end', () => {
      client.destroy();
      if (status === 200) {
        resolve({ ok: true });
      } else {
        const parsed = responseBody ? JSON.parse(responseBody) : {};
        resolve({ ok: false, error: parsed.reason ?? `APNs HTTP ${status}` });
      }
    });
  });
}
