// Local-only guest mode. No DB session. Free roam = read-only browsing.
const KEY = "global-wall:guest";

export const isGuestMode = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};
export const setGuestMode = (on: boolean) => {
  try { on ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch {}
};
export const guestBlock = (action: string): boolean => {
  if (!isGuestMode()) return false;
  // toast lazily to avoid circular import
  import("sonner").then(({ toast }) => toast.error(`Guests can't ${action}. Sign in to unlock!`));
  return true;
};
