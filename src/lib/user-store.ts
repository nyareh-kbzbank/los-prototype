import { create } from "zustand";
import { persist } from "zustand/middleware";
import { redirect } from "@tanstack/react-router";

export type UserRole = "user" | "admin";

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

interface UserState {
	currentUser: User | null;
	setUser: (user: User) => void;
	setRole: (role: UserRole) => void;
	logout: () => void;
	isAdmin: () => boolean;
}

// Default user for demo purposes only
// In production, this should be replaced with actual authentication
const getDefaultUser = (): User => {
	const isDevelopment = process.env.NODE_ENV === "development";
	return {
		id: "demo-user-1",
		name: isDevelopment ? "Demo User" : "Guest",
		email: isDevelopment ? "user@demo.com" : "guest@example.com",
		role: "user",
	};
};

export const useUserStore = create<UserState>()(
	persist(
		(set, get) => ({
			currentUser: getDefaultUser(),
			setUser: (user) => set({ currentUser: user }),
			setRole: (role) =>
				set((state) => ({
					currentUser: state.currentUser
						? { ...state.currentUser, role }
						: null,
				})),
			logout: () => set({ currentUser: null }),
			isAdmin: () => get().currentUser?.role === "admin",
		}),
		{
			name: "user-storage",
		},
	),
);

/**
 * Route guard that requires admin role
 * Use this in TanStack Router's beforeLoad to protect admin-only routes
 */
export function requireAdmin() {
	const isAdmin = useUserStore.getState().isAdmin();
	if (!isAdmin) {
		throw redirect({
			to: "/loan",
			search: {
				error: "admin-required",
			},
		});
	}
}
