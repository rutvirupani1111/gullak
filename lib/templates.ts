// Festival templates prefill titles and prize ideas. The odds and stock start at the safe starter
// shape and the owner sets the real numbers on the tarazu before going live.
export type TemplatePrize = { hi: string; en: string; kind: string; w: number; cost?: number; value?: number; tier?: number; stock?: number | null; cap?: number | null; minBill?: number };
export type Template = { key: string; name: string; hi: string; en: string; game: "chakri" | "patti" | "toss"; days: number; ink: string; prizes: TemplatePrize[] };

const base = (consolation: [string, string], a: [string, string], b: [string, string], c: [string, string]): TemplatePrize[] => [
  { hi: consolation[0], en: consolation[1], kind: "consolation", w: 6000, cost: 200, value: 200 },
  { hi: a[0], en: a[1], kind: "free_item", w: 2500, cost: 800, tier: 1, stock: 60, cap: 12 },
  { hi: b[0], en: b[1], kind: "free_item", w: 1200, cost: 1500, tier: 2, stock: 25, cap: 5 },
  { hi: c[0], en: c[1], kind: "pct_off", value: 20, w: 300, cost: 3000, tier: 3, stock: 6, cap: 1, minBill: 5000 },
];

export const TEMPLATES: Template[] = [
  { key: "roz", name: "Roz ki shaam", hi: "Chai pe chakri", en: "Spin with your chai", game: "chakri", days: 30, ink: "#F4B400",
    prizes: base(["Agli baar ₹2 off", "₹2 off next time"], ["Muft cutting chai", "Free cutting chai"], ["Muft bun maska", "Free bun maska"], ["Poora order 20% off", "20% off the whole order"]) },
  { key: "diwali", name: "Diwali dhamaka", hi: "Diwali ka dibba", en: "The Diwali box", game: "patti", days: 12, ink: "#FF7A1A",
    prizes: base(["Agli baar ₹5 off", "₹5 off next time"], ["Muft kaju katli (2 pc)", "Free kaju katli (2 pc)"], ["Muft mithai dabba (250g)", "Free sweet box (250g)"], ["Diwali order 20% off", "20% off a Diwali order"]) },
  { key: "holi", name: "Holi ke rang", hi: "Rang barse, inaam barse", en: "Colours and prizes", game: "chakri", days: 7, ink: "#E2207B",
    prizes: base(["Agli baar ₹3 off", "₹3 off next time"], ["Muft thandai glass", "Free glass of thandai"], ["Muft gujiya (2 pc)", "Free gujiya (2 pc)"], ["Holi party order 20% off", "20% off a Holi party order"]) },
  { key: "ipl", name: "IPL ki raatein", hi: "Match wali raat", en: "Match night", game: "toss", days: 45, ink: "#0E8A86",
    prizes: base(["Agli baar ₹3 off", "₹3 off next time"], ["Muft chai, chauka laga to", "Free chai for a four"], ["Muft samosa plate", "Free samosa plate"], ["Six maara: 20% off", "A six: 20% off"]) },
  { key: "eid", name: "Eid mubarak", hi: "Eid ki mithaas", en: "Sweetness of Eid", game: "chakri", days: 5, ink: "#13804F",
    prizes: base(["Agli baar ₹5 off", "₹5 off next time"], ["Muft sewaiyan katori", "Free bowl of sewaiyan"], ["Muft sheer khurma", "Free sheer khurma"], ["Daawat order 20% off", "20% off a feast order"]) },
  { key: "navratri", name: "Navratri ki raatein", hi: "Garba ke baad chai", en: "Chai after garba", game: "patti", days: 9, ink: "#D7261E",
    prizes: base(["Agli baar ₹3 off", "₹3 off next time"], ["Muft sabudana vada", "Free sabudana vada"], ["Muft lassi", "Free lassi"], ["Group order 20% off", "20% off a group order"]) },
];
