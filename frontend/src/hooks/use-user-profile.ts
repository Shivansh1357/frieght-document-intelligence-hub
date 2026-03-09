"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/lib/user-store";

const PROFILE_EVENT = "freight-dih-user-profile:changed";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const read = () => setProfile(getUserProfile());
    read();
    setIsLoaded(true);

    // Same-tab updates (custom event) + cross-tab updates (storage event)
    const onProfileChanged = () => read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "freight-dih-user-profile") read();
    };
    window.addEventListener(PROFILE_EVENT, onProfileChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_EVENT, onProfileChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setName = useCallback((name: string, avatarStyle?: UserProfile["avatarStyle"]) => {
    const updated = saveUserProfile(name, avatarStyle);
    setProfile(updated);
  }, []);

  const update = useCallback((updates: Partial<UserProfile>) => {
    const updated = updateUserProfile(updates);
    setProfile(updated);
  }, []);

  return {
    profile,
    isLoaded,
    isFirstVisit: profile?.isFirstVisit ?? true,
    setName,
    update,
  };
}
