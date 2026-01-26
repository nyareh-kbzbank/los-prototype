import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/user-store";

export const Route = createFileRoute("/loan/setup")({
	beforeLoad: () => {
		requireAdmin();
	},
	component: () => <Outlet />,
});
