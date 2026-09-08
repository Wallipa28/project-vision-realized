export type AppRole = "admin" | "manager" | "supervisor" | "quality" | "viewer";

export type LocalUser = {
  id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
};

export type LocalSession = {
  user: LocalUser;
};

type LocalAuthState = {
  users: LocalUser[];
  sessionUserId: string | null;
};

type LocalStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const AUTH_STORAGE_KEY = "production-intelligence:auth:v1";
export const LOCAL_AUTH_EVENT = "production-intelligence:auth-change";

export function getLocalSession(storage = getStorage()): LocalSession | null {
  const state = loadAuthState(storage);
  const user = state.users.find((item) => item.id === state.sessionUserId);
  return user ? { user } : null;
}

export async function signInLocal(
  email: string,
): Promise<{ session: LocalSession | null; error: Error | null }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { session: null, error: new Error("กรุณากรอกอีเมล") };

  const storage = getStorage();
  const state = loadAuthState(storage);
  const existingUser = state.users.find((item) => item.email === normalizedEmail);
  const user = existingUser ?? createLocalUser(normalizedEmail);
  const nextState = {
    users: existingUser ? state.users : [...state.users, user],
    sessionUserId: user.id,
  };
  saveAuthState(nextState, storage);
  notifyAuthChange();
  return { session: { user }, error: null };
}

export async function signUpLocal(
  email: string,
  fullName: string,
): Promise<{ session: LocalSession | null; error: Error | null }> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { session: null, error: new Error("กรุณากรอกอีเมล") };

  const storage = getStorage();
  const state = loadAuthState(storage);
  const existingUser = state.users.find((item) => item.email === normalizedEmail);
  const user = existingUser ?? createLocalUser(normalizedEmail, fullName);
  const nextState = {
    users: existingUser
      ? state.users.map((item) =>
          item.id === user.id ? { ...item, full_name: fullName.trim() || item.full_name } : item,
        )
      : [...state.users, user],
    sessionUserId: user.id,
  };
  saveAuthState(nextState, storage);
  notifyAuthChange();
  return { session: { user }, error: null };
}

export async function signOutLocal() {
  const storage = getStorage();
  const state = loadAuthState(storage);
  saveAuthState({ ...state, sessionUserId: null }, storage);
  notifyAuthChange();
}

export function subscribeLocalAuth(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const onLocalAuth = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY) listener();
  };

  window.addEventListener(LOCAL_AUTH_EVENT, onLocalAuth);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOCAL_AUTH_EVENT, onLocalAuth);
    window.removeEventListener("storage", onStorage);
  };
}

function loadAuthState(storage = getStorage()): LocalAuthState {
  if (!storage) return emptyState();

  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<LocalAuthState>;
    if (!Array.isArray(parsed.users)) return emptyState();
    return {
      users: parsed.users.map(normalizeUser),
      sessionUserId: parsed.sessionUserId ?? null,
    };
  } catch {
    return emptyState();
  }
}

function saveAuthState(state: LocalAuthState, storage: LocalStorageLike | null) {
  if (!storage) return;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function createLocalUser(email: string, fullName = ""): LocalUser {
  return {
    id: `local-${hashText(email).toString(36)}`,
    email,
    full_name: fullName.trim() || email.split("@")[0] || email,
    roles: ["manager"],
  };
}

function normalizeUser(user: LocalUser): LocalUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.email.split("@")[0] || user.email,
    roles: user.roles?.length ? user.roles : ["manager"],
  };
}

function emptyState(): LocalAuthState {
  return { users: [], sessionUserId: null };
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.includes("@") ? normalized : "";
}

function notifyAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCAL_AUTH_EVENT));
}

function getStorage(): LocalStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
