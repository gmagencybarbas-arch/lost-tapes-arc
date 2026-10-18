const HOUR = 60 * 60 * 1000;
const DUPLICATE_WINDOW = 15 * 60 * 1000;
const MAX_PER_HOUR = 8;

type Bucket = {
  stamps: number[];
  saved: Map<string, number>;
  inflight: Set<string>;
};

const buckets = new Map<string, Bucket>();

function bucketFor(ip: string, now: number): Bucket {
  const current = buckets.get(ip) ?? { stamps: [], saved: new Map(), inflight: new Set() };
  current.stamps = current.stamps.filter((stamp) => now - stamp < HOUR);
  for (const [hash, at] of current.saved) {
    if (now - at > DUPLICATE_WINDOW) current.saved.delete(hash);
  }
  buckets.set(ip, current);
  if (buckets.size > 2000) buckets.clear();
  return current;
}

export function beginSubmission(
  ip: string,
  fingerprint: string,
  now = Date.now(),
): { ok: true; finish: (saved: boolean) => void } | { ok: false; error: string } {
  const bucket = bucketFor(ip, now);
  if (bucket.saved.has(fingerprint) || bucket.inflight.has(fingerprint)) {
    return {
      ok: false,
      error: 'Esse envio já foi recebido agora há pouco. Espere um pouco antes de tentar de novo.',
    };
  }
  if (bucket.stamps.length >= MAX_PER_HOUR) {
    return { ok: false, error: 'Muitos envios seguidos deste acesso. Tente de novo mais tarde.' };
  }

  bucket.inflight.add(fingerprint);
  bucket.stamps.push(now);
  let closed = false;

  return {
    ok: true,
    finish(saved: boolean) {
      if (closed) return;
      closed = true;
      bucket.inflight.delete(fingerprint);
      if (saved) bucket.saved.set(fingerprint, Date.now());
    },
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = forwarded || request.headers.get('x-real-ip') || 'local';
  return candidate.slice(0, 80) || 'local';
}
