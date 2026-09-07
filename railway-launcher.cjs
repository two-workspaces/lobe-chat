// Railway launcher for lobehub/lobehub. Runs as root, ends as uid 1001 (nextjs).
const fs = require('node:fs');
const net = require('node:net');
const crypto = require('node:crypto');

const DATA_DIR = process.env.JWKS_DIR || '/data';
const NEXTJS = 1001;

const waitForDb = async () => {
  const u = new URL(process.env.DATABASE_URL);
  const port = Number(u.port || 5432);
  for (let i = 0; i < 120; i++) {
    const ok = await new Promise((r) => {
      const s = net.connect({ host: u.hostname, port }, () => { s.destroy(); r(true); });
      s.on('error', () => r(false));
      s.setTimeout(3000, () => { s.destroy(); r(false); });
    });
    if (ok) return console.log(`✅ Postgres reachable at ${u.hostname}:${port}`);
    if (i === 0) console.log(`⏳ Waiting for Postgres at ${u.hostname}:${port} ...`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  console.error('❌ Postgres never became reachable'); process.exit(1);
};

// JWKS_KEY is required by LobeHub and must be stable across redeploys (OIDC
// tokens are signed with it). Generate once, keep it on the volume.
const ensureJwks = () => {
  if (process.env.JWKS_KEY) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = `${DATA_DIR}/jwks.json`;
  if (!fs.existsSync(file)) {
    const jwk = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'jwk' });
    Object.assign(jwk, { use: 'sig', kid: crypto.randomBytes(8).toString('hex'), alg: 'RS256' });
    fs.writeFileSync(file, JSON.stringify({ keys: [jwk] }), { mode: 0o600 });
    console.log(`✅ Generated JWKS_KEY -> ${file}`);
  }
  process.env.JWKS_KEY = fs.readFileSync(file, 'utf8');
};

// Railway buckets are private and have no CORS by default; LobeHub uploads from
// the browser with presigned URLs, so the bucket must allow APP_URL. Idempotent.
const ensureCors = async () => {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, APP_URL } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !APP_URL) return;
  try {
    const { S3Client, PutBucketCorsCommand } = require('/app/node_modules/@aws-sdk/client-s3');
    const s3 = new S3Client({
      endpoint: S3_ENDPOINT, region: S3_REGION || 'auto',
      forcePathStyle: process.env.S3_ENABLE_PATH_STYLE === '1',
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    });
    await s3.send(new PutBucketCorsCommand({ Bucket: S3_BUCKET, CORSConfiguration: { CORSRules: [{
      AllowedOrigins: [new URL(APP_URL).origin, 'http://localhost:3015'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
      AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3000,
    }] } }));
    console.log(`✅ Bucket CORS set for ${new URL(APP_URL).origin}`);
  } catch (e) { console.error('⚠️ Could not set bucket CORS (uploads from the browser may fail):', e.message); }
};

(async () => {
  await waitForDb();
  ensureJwks();
  await ensureCors();
  try { fs.chownSync(DATA_DIR, NEXTJS, NEXTJS); for (const f of fs.readdirSync(DATA_DIR)) fs.chownSync(`${DATA_DIR}/${f}`, NEXTJS, NEXTJS); } catch {}
  process.setgid(NEXTJS); process.setuid(NEXTJS);
  process.env.HOME = '/home/nextjs';
  require('/app/startServer.js');
})();
