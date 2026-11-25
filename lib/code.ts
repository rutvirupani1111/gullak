// Coupon codes: 6 random Crockford base32 characters plus a Luhn mod 32 check character.
// Shared by the server (minting) and the counter screen (catching typos before any network call).
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function normalise(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

export function luhnChar(data: string): string {
  const n = 32;
  let factor = 2;
  let sum = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const cp = CROCKFORD.indexOf(data[i]);
    if (cp < 0) return "";
    let addend = factor * cp;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / n) + (addend % n);
    sum += addend;
  }
  const rem = sum % n;
  return CROCKFORD[(n - rem) % n];
}

export function isValidCode(input: string): boolean {
  const c = normalise(input);
  if (c.length !== 7) return false;
  for (const ch of c) if (CROCKFORD.indexOf(ch) < 0) return false;
  return luhnChar(c.slice(0, 6)) === c[6];
}

/** Index of the first box that is wrong, or -1. Used to paint the bad box red. */
export function badBox(input: string): number {
  const c = normalise(input);
  for (let i = 0; i < c.length; i++) if (CROCKFORD.indexOf(c[i]) < 0) return i;
  if (c.length === 7 && !isValidCode(c)) return 6;
  return -1;
}

export function formatCode(code: string) {
  return code.slice(0, 4) + "-" + code.slice(4);
}

export function parseQr(text: string): { slug: string; code: string } | null {
  const m = /^GK1:([a-z0-9-]{3,40}):([0-9A-Z]{7})$/.exec(text.trim());
  return m ? { slug: m[1], code: m[2] } : null;
}
