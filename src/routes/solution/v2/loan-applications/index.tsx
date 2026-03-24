import { createFileRoute } from "@tanstack/react-router";
import { V2LoanApplicationListPage } from "@/components/loan/v2/V2LoanApplicationListPage";

export const Route = createFileRoute("/solution/v2/loan-applications/")({
	component: V2LoanApplicationListPage,
});
