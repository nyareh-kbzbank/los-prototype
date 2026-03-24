import { createFileRoute } from "@tanstack/react-router";
import { V2LoanSetupListPage } from "@/components/loan/v2/V2LoanSetupListPage";

export const Route = createFileRoute("/solution/v2/list")({
	component: V2LoanSetupListPage,
});
