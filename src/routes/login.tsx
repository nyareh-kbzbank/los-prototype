import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { getRoleHomePath, useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const login = useAuthStore((state) => state.login);
	const session = useAuthStore((state) => state.session);

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const isAuthenticated = login(username, password);
		if (!isAuthenticated) {
			setError("Invalid username or password");
			return;
		}
		const nextSession = useAuthStore.getState().session;
		if (!nextSession) return;
		setError("");
		navigate({ to: getRoleHomePath(nextSession.role) });
	};

	if (session) {
		return (
			<div className="max-w-md mx-auto mt-12 rounded border bg-white p-6 shadow-sm">
				<h1 className="text-2xl font-bold text-slate-900">Already signed in</h1>
				<p className="mt-2 text-sm text-slate-600">
					You are signed in as <span className="font-semibold">{session.username}</span>.
				</p>
				<button
					type="button"
					onClick={() => navigate({ to: getRoleHomePath(session.role) })}
					className="mt-4 rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
				>
					Continue
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto mt-12 rounded border bg-white p-6 shadow-sm">
			<h1 className="text-2xl font-bold text-slate-900">Login</h1>
			<p className="mt-2 text-sm text-slate-600">
				Use one of the prototype accounts below.
			</p>
			<div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
				<p>
					<span className="font-semibold">Admin:</span> admin / admin123
				</p>
				<p>
					<span className="font-semibold">Customer:</span> customer / customer123
				</p>
				<p>
					<span className="font-semibold">Maker:</span> maker / maker123
				</p>
				<p>
					<span className="font-semibold">Checker:</span> checker / checker123
				</p>
			</div>

			<form onSubmit={onSubmit} className="mt-5 space-y-4">
				<label className="block">
					<span className="mb-1 block text-sm font-medium text-slate-700">
						Username
					</span>
					<input
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
						autoComplete="username"
						required
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-sm font-medium text-slate-700">
						Password
					</span>
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
						autoComplete="current-password"
						required
					/>
				</label>
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
				<button
					type="submit"
					className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
				>
					Sign in
				</button>
			</form>
		</div>
	);
}
