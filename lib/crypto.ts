import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(k + " is not set");
  return v;
};
const key32 = (k: string) => createHash("sha256").update(env(k)).digest();

export const sha256 = (b: string | Buffer) => createHash("sha256").update(b).digest();
export const hmac = (secret: string | Buffer, data: string | Buffer) => createHmac("sha256", secret).update(data).digest();
export const appHmac = (data: string) => hmac(key32("APP_SECRET"), data);
export const token = (n = 32) => randomBytes(n).toString("base64url");

export function scryptHash(pw: string): string {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `s1$${salt.toString("base64")}$${h.toString("base64")}`;
}
export function scryptVerify(pw: string, stored: string): boolean {
  const [, s, h] = stored.split("$");
  if (!s || !h) return false;
  const got = scryptSync(pw, Buffer.from(s, "base64"), 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const want = Buffer.from(h, "base64");
  return want.length === got.length && timingSafeEqual(want, got);
}

function seal(keyName: string, plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key32(keyName), iv);
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}
function open(keyName: string, box: Buffer): Buffer {
  const d = createDecipheriv("aes-256-gcm", key32(keyName), box.subarray(0, 12));
  d.setAuthTag(box.subarray(12, 28));
  return Buffer.concat([d.update(box.subarray(28)), d.final()]);
}
export const encPhone = (e164: string) => seal("APP_DATA_KEY", Buffer.from(e164));
export const decPhone = (b: Buffer) => open("APP_DATA_KEY", b).toString();
export const phoneHash = (e164: string) => hmac(key32("APP_DATA_KEY").toString("hex") + ":lookup", e164);

export function newShopKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const priv = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  return { pub: pub.subarray(pub.length - 32), privEnc: seal("SIGNING_KEK", priv) };
}
export function signWith(privEnc: Buffer, msg: string): Buffer {
  const key = createPrivateKey({ key: open("SIGNING_KEK", privEnc), format: "der", type: "pkcs8" });
  return sign(null, Buffer.from(msg), key);
}
export function verifyWith(pubRaw: Buffer, msg: string, sig: Buffer): boolean {
  const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), pubRaw]);
  return verify(null, Buffer.from(msg), createPublicKey({ key: der, format: "der", type: "spki" }), sig);
}

/** Canonical JSON: keys sorted, no whitespace. The signature covers exactly this string. */
export function canonical(o: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => ((a[k] = o[k]), a), {}));
}

export function ipHash(ip: string): Buffer {
  const day = new Date().toISOString().slice(0, 10);
  return hmac(key32("APP_SECRET"), "ip:" + day + ":" + subnet(ip));
}
export function subnet(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::/56";
  return ip.split(".").slice(0, 3).join(".") + ".0/24";
}
