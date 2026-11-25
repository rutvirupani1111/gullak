// Spring curves as literal strings for WAAPI, which cannot read CSS custom properties.
// The same curves live in globals.css as --spring-snap and --spring-soft.
export const SPRING_SNAP = "linear(0, 0.2 6%, 0.62 14%, 0.95 22%, 1.08 29%, 1.1 34%, 1.06 42%, 1.01 52%, 0.99 62%, 1)";
export const SPRING_SOFT = "linear(0, 0.16 7%, 0.52 16%, 0.86 26%, 1.03 35%, 1.06 42%, 1.03 52%, 1 64%, 1)";
export const EASE_HERO = "cubic-bezier(.65,0,.35,1)";

export function reducedMotion() {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
