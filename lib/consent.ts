// Consent text (DPDP Act 2023), WhatsApp templates and the common-password list. Shared by server and client.
export const CONSENT_VERSION = "2026-11-v1";

export function consentText(shop: string, lang: string) {
  if (lang === "en") return `I agree to receive offers and reminders from ${shop} on WhatsApp. I can stop this any time with "Delete my data".`;
  return `Main ${shop} se WhatsApp par offer aur yaad-dihani paane ke liye haan kehta/kehti hoon. Kabhi bhi 'Mera data hatao' se band kar sakte hain.`;
}

const T: Record<string, ((s: string, n: string, l: string) => string)[]> = {
  hi: [
    (s, n, l) => `Namaste${n}! ${s} se. Kaafi din ho gaye. Is hafte aao, aapke liye ek bonus khel rakha hai: ${l} (7 din tak). Band karna ho to 'STOP' likhein.`,
    (s, n, l) => `${s} yaad kar raha hai${n}. Agli chai par ek extra khel aapka: ${l}. Band karne ke liye 'STOP' likhein.`,
  ],
  en: [
    (s, n, l) => `Hello${n}, this is ${s}. It has been a while. Here is a bonus game for your next visit: ${l} (valid 7 days). Reply STOP to opt out.`,
    (s, n, l) => `${s} misses you${n}. One extra game is waiting for you: ${l}. Reply STOP to opt out.`,
  ],
};
export function waTemplate(lang: string, shop: string, first: string | null, link: string) {
  const list = T[lang === "en" ? "en" : "hi"];
  const pick = list[(link.length + (first?.length ?? 0)) % list.length];
  return pick(shop, first ? " " + first : "", link);
}

export const COMMON = new Set(["password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "iloveyou", "11111111", "00000000", "abcd1234", "password123", "india123", "admin123", "welcome1", "qwertyuiop", "87654321", "12341234", "asdfghjk", "sunshine", "princess"]);
