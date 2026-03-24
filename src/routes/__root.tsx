
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	redirect,
	Scripts,
} from "@tanstack/react-router";
import { canAccessPath, getRoleHomePath, useAuthStore } from "@/lib/auth-store";
import Header from "../components/Header";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	beforeLoad: ({ location }) => {
		const session = useAuthStore.getState().session;
		const pathname = location.pathname;

		if (pathname === "/login") {
			if (session) {
				throw redirect({ to: getRoleHomePath(session.role) });
			}
			return;
		}

		if (!session) {
			throw redirect({ to: "/login" });
		}

		if (!canAccessPath(session.role, pathname)) {
			throw redirect({ to: getRoleHomePath(session.role) });
		}
	},

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Header />
				{children}
				{/* <TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
						StoreDevtools,
						AiDevtools,
					]}
				/> */}
				<Scripts />
			</body>
		</html>
	);
}
