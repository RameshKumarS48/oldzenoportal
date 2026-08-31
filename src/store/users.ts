"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_USERS } from "@/lib/mock/users";
import type { AppUser, UserRole, UserStatus } from "@/lib/mock/users";
import { hashPassword, createInviteToken } from "@/lib/auth-utils";

export interface PendingInvite {
  token: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  customPermissions?: Array<{ module: string; actions: string[] }>;
}

interface UsersState {
  users: AppUser[];
  invites: PendingInvite[];
  addUser: (data: { name: string; email: string; role: UserRole; password?: string }) => void;
  updateUser: (id: string, data: Partial<Pick<AppUser, "name" | "email" | "role" | "status">>) => void;
  deleteUser: (id: string) => void;
  createInvite: (email: string, role: UserRole, invitedBy: string, customPermissions?: Array<{ module: string; actions: string[] }>) => Promise<PendingInvite>;
  registerFromInvite: (email: string, role: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
              password: data.password,
              status: "active" as UserStatus,
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

      createInvite: async (email, role, invitedBy, customPermissions) => {
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) throw new Error("A user with this email already exists.");

        const token = await createInviteToken({ email, role, invitedBy });
        const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

        const invite: PendingInvite = {
          token,
          email,
          role,
          invitedBy,
          createdAt: new Date().toISOString(),
          expiresAt,
          customPermissions,
        };

        set((s) => ({
          invites: [
            ...s.invites.filter((i) => i.email.toLowerCase() !== email.toLowerCase()),
            invite,
          ],
        }));

        return invite;
      },

      // Called after the invite page has already verified the token signature
      registerFromInvite: async (email, role, name, password) => {
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) return { success: false, error: "An account with this email already exists." };

        const hashedPassword = await hashPassword(password);
        const pendingInvite = get().invites.find((i) => i.email.toLowerCase() === email.toLowerCase());

        const newUser: AppUser = {
          id: `u-${Date.now()}`,
          name: name.trim(),
          email,
          role: role as UserRole,
          password: hashedPassword,
          status: "active",
          createdAt: new Date().toISOString().split("T")[0],
          customPermissions: pendingInvite?.customPermissions,
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
    { name: "zeno-users" }
  )
);
