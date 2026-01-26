import { Link } from "@tanstack/react-router";
import {
	ClipboardType,
	Home,
	Menu,
	Network,
	Receipt,
	SquareFunction,
	Table,
	X,
	Shield,
	User,
} from "lucide-react";

import { useState } from "react";
import { useUserStore } from "@/lib/user-store";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const currentUser = useUserStore((s) => s.currentUser);
	const setRole = useUserStore((s) => s.setRole);
	const isAdmin = currentUser?.role === "admin";

	const toggleRole = () => {
		setRole(isAdmin ? "user" : "admin");
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
						LOS
					</Link>
				</h1>
				<div className="ml-auto flex items-center gap-2 text-sm">
					{isAdmin ? (
						<div className="flex items-center gap-1 px-2 py-1 bg-cyan-600 rounded">
							<Shield size={16} />
							<span>Admin</span>
						</div>
					) : (
						<div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded">
							<User size={16} />
							<span>User</span>
						</div>
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
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					<Link
						to="/loan/setup"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<ClipboardType size={20} />
						<span className="font-medium">Loan Setup</span>
					</Link>

					<Link
						to="/loan/scorecard-setup"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<SquareFunction size={20} />
						<span className="font-medium">Scorecard Setup</span>
					</Link>

					<Link
						to="/loan/repayment-setup"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<Receipt size={20} />
						<span className="font-medium">Repayment Setup</span>
					</Link>

					<Link
						to="/loan/applications/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<Table size={20} />
						<span className="font-medium">Loan Applications</span>
					</Link>

					<Link
						to="/loan/applications/create"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<ClipboardType size={20} />
						<span className="font-medium">New Application</span>
					</Link>

					<Link
						to="/workflow"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
						}}
					>
						<Network size={20} />
						<span className="font-medium">Workflows</span>
					</Link>
				</nav>

				<div className="p-4 border-t border-gray-700 bg-gray-800">
					<div className="mb-2 text-xs text-gray-400">Current Role</div>
					<button
						onClick={toggleRole}
						type="button"
						className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg transition-colors ${
							isAdmin
								? "bg-cyan-600 hover:bg-cyan-700"
								: "bg-gray-700 hover:bg-gray-600"
						}`}
					>
						<div className="flex items-center gap-2">
							{isAdmin ? <Shield size={18} /> : <User size={18} />}
							<span className="font-medium">
								{isAdmin ? "Administrator" : "User"}
							</span>
						</div>
						<span className="text-xs text-gray-300">Click to toggle</span>
					</button>
					<div className="mt-2 text-xs text-gray-400">
						{currentUser?.name} ({currentUser?.email})
					</div>
				</div>
			</aside>
		</>
	);
}
