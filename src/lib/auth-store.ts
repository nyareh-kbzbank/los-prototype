import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountRole = "admin" | "customer";

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
};

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			session: null,
			login: (username, password) => {
				const normalized = username.trim().toLowerCase();
				const account = accounts[normalized];
				if (!account || account.password !== password) {
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
	return role === "admin"
		? "/solution/v2/loan-setup"
		: "/loan/applications/create";
}

export function canAccessPath(role: AccountRole, pathname: string) {
	const adminOnlyPrefixes = [
		"/loan/setup",
		"/workflow",
		"/loan/scorecard-setup",
		"/loan/scorecard-setup-advanced",
		"/loan/repayment-setup",
		"/loan/repayment-plans",
		"/loan/scorecards",
		"/loan/maker-inbox",
		"/loan/checker-inbox",
		"/solution/v2/loan-setup",
	];
	const adminOnlyExact = ["/loan"];

	if (role === "admin") return true;

	const isAdminOnlyPrefix = adminOnlyPrefixes.some((prefix) =>
		pathname.startsWith(prefix),
	);
	if (isAdminOnlyPrefix) return false;
	if (adminOnlyExact.includes(pathname)) return false;

	if (pathname.startsWith("/loan/applications")) return true;
	if (pathname === "/") return true;
	if (pathname === "/login") return true;
	return false;
}
