export type DemoRole = "patient" | "provider";

export const ROLE_STORAGE_KEY = "naadi-demo-role";

export function getDemoRole(): DemoRole {
  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return storedRole === "provider" ? "provider" : "patient";
}

export function setDemoRole(role: DemoRole) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}
