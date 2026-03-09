"use client";

const STORAGE_KEY = "freight-dih-user-profile";
const PROFILE_EVENT = "freight-dih-user-profile:changed";

export type AvatarStyle = "notionists" | "adventurer" | "avataaars";

export interface UserProfile {
  name: string;
  initials: string;
  avatarColor: string;
  avatarStyle: AvatarStyle;
  isFirstVisit: boolean;
  createdAt: string;
}

const AVATAR_COLORS = [
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-blue-500 to-cyan-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-orange-500 to-amber-600",
  "bg-gradient-to-br from-pink-500 to-rose-600",
  "bg-gradient-to-br from-indigo-500 to-blue-600",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function stableColorForName(name: string): string {
  const s = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] || AVATAR_COLORS[0];
}

function notifyProfileChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(PROFILE_EVENT));
  } catch {
    // ignore
  }
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Admin User",
  initials: "AU",
  avatarColor: AVATAR_COLORS[0],
  avatarStyle: "notionists",
  isFirstVisit: true,
  createdAt: new Date().toISOString(),
};

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserProfile>;
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        avatarStyle: (parsed.avatarStyle as AvatarStyle) || DEFAULT_PROFILE.avatarStyle,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfile(
  name: string,
  avatarStyle: AvatarStyle = "notionists"
): UserProfile {
  const profile: UserProfile = {
    name,
    initials: getInitials(name),
    avatarColor: stableColorForName(name) || randomColor(),
    avatarStyle,
    isFirstVisit: false,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  notifyProfileChanged();
  return profile;
}

export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated = { ...current, ...updates };
  if (updates.name) {
    updated.initials = getInitials(updates.name);
    updated.avatarColor = stableColorForName(updates.name);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyProfileChanged();
  return updated;
}

export function markOnboardingComplete(): void {
  updateUserProfile({ isFirstVisit: false });
}

export function hasCompletedOnboarding(): boolean {
  return !getUserProfile().isFirstVisit;
}
