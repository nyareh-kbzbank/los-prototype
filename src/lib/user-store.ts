import { create } from "zustand";
import { persist } from "zustand/middleware";

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

// Default user for demo purposes
const defaultUser: User = {
	id: "demo-user-1",
	name: "Demo User",
	email: "user@demo.com",
	role: "user",
};

export const useUserStore = create<UserState>()(
	persist(
		(set, get) => ({
			currentUser: defaultUser,
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
