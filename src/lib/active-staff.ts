// Client-side helper for the "who is currently using the iPad" identity.
// Stored in sessionStorage with a last-activity timestamp; the staff page
// re-locks after IDLE_MS of inactivity and the user must re-enter their PIN.
const KEY = "active_staff_v1";
export const IDLE_MS = 5 * 60 * 1000; // 5 minutes

export type ActiveStaff = { id: string; name: string; touchedAt: number };

export function getActiveStaff(): ActiveStaff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ActiveStaff;
    if (!s.id || !s.name || typeof s.touchedAt !== "number") return null;
    if (Date.now() - s.touchedAt > IDLE_MS) return null;
    return s;
  } catch {
    return null;
  }
}

export function setActiveStaff(s: { id: string; name: string }) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify({ ...s, touchedAt: Date.now() }));
}

export function touchActiveStaff() {
  const s = getActiveStaff();
  if (s) setActiveStaff({ id: s.id, name: s.name });
}

export function clearActiveStaff() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
