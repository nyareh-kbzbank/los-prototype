import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountRole = "admin" | "customer" | "maker" | "checker";

export type AuthSession = {
	username: string;
	role: AccountRole;
};

type AuthState = {
	session: AuthSession | null;
	login: (username: string, password: string) => boolean;
	logout: () => void;
};

const accounts: Record<string, { password: string; role: AccountRole }> = {
	admin: { password: "admin123", role: "admin" },
	customer: { password: "customer123", role: "customer" },
	maker: { password: "maker123", role: "maker" },
	checker: { password: "checker123", role: "checker" },
};

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			session: null,
			login: (username, password) => {
				const normalized = username.trim().toLowerCase();
				const account = accounts[normalized];
				if (account?.password !== password) {
					return false;
				}
				set({
					session: {
						username: normalized,
						role: account.role,
					},
				});
				return true;
			},
			logout: () => set({ session: null }),
		}),
		{
			name: "loan-auth-session",
			version: 1,
			partialize: (state) => ({ session: state.session }),
		},
	),
);

export function getRoleHomePath(role: AccountRole) {
	if (role === "admin") return "/solution/v2/loan-setup";
	if (role === "customer") return "/solution/v2/loan-applications/create";
	if (role === "maker") return "/solution/v2/loan-applications/maker-inbox";
	if (role === "checker") return "/solution/v2/loan-applications/checker-inbox";
	return "/solution/v2/";
}

export function canAccessPath(role: AccountRole, pathname: string) {
	if (role === "admin") return true;

	if (pathname === "/" || pathname === "/login") {
		return true;
	}

	const customerPrefixes = [
		"/solution/v2/loan-applications",
		"/loan/emi-calculator",
		"/loan/emi-custom-calculator",
	];

	if (role === "customer") {
		return customerPrefixes.some((prefix) => pathname.startsWith(prefix));
	}

	if (role === "maker") {
		return (
			pathname.startsWith("/solution/v2/loan-applications") &&
			!pathname.startsWith("/solution/v2/loan-applications/checker-inbox")
		);
	}

	if (role === "checker") {
		return (
			pathname.startsWith("/solution/v2/loan-applications") &&
			!pathname.startsWith("/solution/v2/loan-applications/maker-inbox")
		);
	}

	return false;
}
