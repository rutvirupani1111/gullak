// One QR reader for the counter camera and the poster self-test.
// BarcodeDetector where the browser has it (most Android phones); otherwise jsQR, loaded only when needed,
// which covers iPhones and desktop browsers. Large images are scaled down first so a 1 GB phone does not choke.
type Detector = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type JsQR = (data: Uint8ClampedArray, w: number, h: number, o?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }) => { data: string } | null;

let jsqr: Promise<JsQR> | null = null;
const loadJsQR = () => (jsqr ??= import("jsqr").then((m) => (m.default ?? m) as unknown as JsQR));

export function qrReader(maxSide = 640) {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: unknown) => Detector }).BarcodeDetector;
  const native: Detector | null = BD ? new BD({ formats: ["qr_code"] }) : null;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  return {
    engine: native ? "native" : "jsqr",
    /** Returns the QR text, or null when none is found in this frame. Never throws. */
    async read(src: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<string | null> {
      try {
        if (native) {
          const r = await native.detect(src);
          if (r[0]) return r[0].rawValue;
          return null;
        }
        if (!canvas) return null;
        const w0 = src instanceof HTMLVideoElement ? src.videoWidth : src instanceof HTMLImageElement ? src.naturalWidth : src.width;
        const h0 = src instanceof HTMLVideoElement ? src.videoHeight : src instanceof HTMLImageElement ? src.naturalHeight : src.height;
        if (!w0 || !h0) return null;
        const k = Math.min(1, maxSide / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(src, 0, 0, w, h);
        const decode = await loadJsQR();
        const hit = decode(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        return hit?.data ?? null;
      } catch {
        return null;
      }
    },
  };
}
