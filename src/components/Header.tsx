import { Link, useNavigate } from "@tanstack/react-router";
import {
	ClipboardType,
	Home,
	LogOut,
	Menu,
	Network,
	Receipt,
	SquareFunction,
	Table,
	X,
} from "lucide-react";

import { useState } from "react";
import { type AccountRole, useAuthStore } from "@/lib/auth-store";

type NavItem = {
	to: string;
	label: string;
	icon: typeof Home;
	roles?: AccountRole[];
};

const navItems: NavItem[] = [
	{ to: "/", label: "Home", icon: Home },
	{ to: "/loan/setup", label: "Loan Setup", icon: ClipboardType, roles: ["admin"] },
	{
		to: "/loan/scorecard-setup",
		label: "Scorecard Setup",
		icon: SquareFunction,
		roles: ["admin"],
	},
	{
		to: "/loan/repayment-setup",
		label: "Repayment Setup",
		icon: Receipt,
		roles: ["admin"],
	},
	{
		to: "/loan/applications/",
		label: "Loan Applications",
		icon: Table,
		roles: ["admin", "customer"],
	},
	{
		to: "/loan/applications/create",
		label: "New Application",
		icon: ClipboardType,
		roles: ["admin", "customer"],
	},
	{ to: "/workflow", label: "Workflows", icon: Network, roles: ["admin"] },
];

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const navigate = useNavigate();
	const session = useAuthStore((state) => state.session);
	const logout = useAuthStore((state) => state.logout);

	const visibleItems = navItems.filter((item) => {
		if (!item.roles) return true;
		if (!session) return false;
		return item.roles.includes(session.role);
	});

	const handleLogout = () => {
		logout();
		setIsOpen(false);
		navigate({ to: "/login" });
	};

	return (
		<>
			<header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
				<button
					onClick={() => setIsOpen(true)}
					className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Open menu"
					type="button"
				>
					<Menu size={24} />
				</button>
				<h1 className="ml-4 text-xl font-semibold">
					<Link to="/" className="text-4xl font-bold">
						Smart Lending Solution
					</Link>
				</h1>
				<div className="ml-auto flex items-center gap-3 text-sm">
					{session ? (
						<>
							<span className="rounded bg-gray-700 px-2 py-1">
								{session.username} ({session.role})
							</span>
							<button
								type="button"
								onClick={handleLogout}
								className="rounded border border-gray-500 px-2 py-1 hover:bg-gray-700"
							>
								Logout
							</button>
						</>
					) : (
						<Link to="/login" className="rounded border border-gray-500 px-2 py-1 hover:bg-gray-700">
							Login
						</Link>
					)}
				</div>
			</header>

			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-gray-700">
					<h2 className="text-xl font-bold">Navigation</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Close menu"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					{visibleItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.to}
								to={item.to}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
								activeProps={{
									className:
										"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
								}}
							>
								<Icon size={20} />
								<span className="font-medium">{item.label}</span>
							</Link>
						);
					})}

					{session ? (
						<button
							type="button"
							onClick={handleLogout}
							className="mt-3 flex w-full items-center gap-3 p-3 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
						>
							<LogOut size={20} />
							<span className="font-medium">Logout</span>
						</button>
					) : null}
				</nav>

				{/* <div className="p-4 border-t border-gray-700 bg-gray-800 flex flex-col gap-2">
          <TanChatAIAssistant />
        </div> */}
			</aside>
		</>
	);
}
