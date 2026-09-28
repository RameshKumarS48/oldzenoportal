"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppUser } from "@/lib/mock/users";
import { useUsersStore } from "@/store/users";
import { createSessionToken } from "@/lib/auth-utils";

interface AuthState {
  user: Omit<AppUser, "password"> | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /**
   * Completes sign-in for an email whose OTP has already been verified by
   * `useOtpStore`. There is no password path — every user signs in by code.
   */
  loginWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

async function setSessionCookie(uid: string, role: string) {
  if (typeof document === "undefined") return;
  const token = await createSessionToken({
    uid,
    role,
    exp: Math.floor(Date.now() / 1000) + 86400,
  });
  document.cookie = `zeno-session=${token}; path=/; max-age=86400; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "zeno-session=; path=/; max-age=0; SameSite=Lax";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      loginWithOtp: async (email: string) => {
        const users = useUsersStore.getState().users;
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

        // These were already checked when the code was issued; re-checking keeps
        // the store safe to call directly and covers a user deactivated mid-flow.
        if (!user) {
          return { success: false, error: "No account found with that email address." };
        }
        if (user.status === "inactive") {
          return { success: false, error: "Your account is inactive. Contact an administrator." };
        }

        set({ user });
        await setSessionCookie(user.id, user.role);
        return { success: true };
      },

      logout: () => {
        set({ user: null });
        clearSessionCookie();
      },
    }),
    {
      name: "zeno-auth",
      // Never persist the password field
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.user) {
          // Refresh cookie on page reload if already logged in
          setSessionCookie(state.user.id, state.user.role);
        }
      },
    }
  )
);
