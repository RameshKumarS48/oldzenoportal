"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_USERS } from "@/lib/mock/users";
import type { AppUser, UserRole, UserStatus } from "@/lib/mock/users";
import { createInviteToken } from "@/lib/auth-utils";

export interface PendingInvite {
  token: string;
  email: string;
  /** Captured on step 1 of the invite dialog and carried onto the new account. */
  name: string;
  role: UserRole;
  /** Tenant the invitee belongs to, "zeno" for internal roles. */
  partnerId: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface InviteInput {
  email: string;
  name: string;
  role: UserRole;
  partnerId: string;
  invitedBy: string;
}

interface UsersState {
  users: AppUser[];
  invites: PendingInvite[];
  addUser: (data: { name: string; email: string; role: UserRole; partnerId?: string }) => void;
  updateUser: (id: string, data: Partial<Pick<AppUser, "name" | "email" | "role" | "status" | "partnerId">>) => void;
  deleteUser: (id: string) => void;
  createInvite: (input: InviteInput) => Promise<PendingInvite>;
  registerFromInvite: (email: string, role: string, name: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string) => void;
  revokeInvite: (token: string) => void;
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      invites: [],

      addUser: (data) =>
        set((s) => ({
          users: [
            ...s.users,
            {
              id: `u-${Date.now()}`,
              name: data.name,
              email: data.email,
              role: data.role,
              partnerId: data.partnerId,
              status: "active" as UserStatus,
              emailVerified: true,
              createdAt: new Date().toISOString().split("T")[0],
            },
          ],
        })),

      updateUser: (id, data) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        })),

      deleteUser: (id) =>
        set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      createInvite: async ({ email, name, role, partnerId, invitedBy }) => {
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) throw new Error("A user with this email already exists.");

        const token = await createInviteToken({ email, role, invitedBy });
        const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

        const invite: PendingInvite = {
          token,
          email,
          name,
          role,
          partnerId,
          invitedBy,
          createdAt: new Date().toISOString(),
          expiresAt,
        };

        set((s) => ({
          invites: [
            ...s.invites.filter((i) => i.email.toLowerCase() !== email.toLowerCase()),
            invite,
          ],
        }));

        return invite;
      },

      // Called after the invite page has already verified the token signature.
      // No password is set, every account signs in with an emailed OTP.
      registerFromInvite: async (email, role, name) => {
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) return { success: false, error: "An account with this email already exists." };

        const pendingInvite = get().invites.find((i) => i.email.toLowerCase() === email.toLowerCase());

        const newUser: AppUser = {
          id: `u-${Date.now()}`,
          name: name.trim(),
          email,
          role: role as UserRole,
          partnerId: pendingInvite?.partnerId,
          status: "active",
          // Completing the invite proves the address; the OTP proves it again at
          // every sign-in, so there's no separate verification step.
          emailVerified: true,
          createdAt: new Date().toISOString().split("T")[0],
        };

        set((s) => ({
          users: [...s.users, newUser],
          invites: s.invites.filter((i) => i.email.toLowerCase() !== email.toLowerCase()),
        }));

        return { success: true };
      },

      verifyEmail: (email) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.email.toLowerCase() === email.toLowerCase() ? { ...u, emailVerified: true } : u
          ),
        })),

      revokeInvite: (token) =>
        set((s) => ({ invites: s.invites.filter((i) => i.token !== token) })),
    }),
    {
      name: "zeno-users",
      // Bump whenever SEED_USERS changes so existing browsers re-seed instead of
      // rehydrating a stale roster and silently missing the new accounts.
      version: 2,
      migrate: () => ({ users: SEED_USERS, invites: [] }),
    }
  )
);
