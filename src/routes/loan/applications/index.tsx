import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  getLoanApplicationList,
  useLoanApplicationStore,
} from "@/lib/loan-application-store";
import { useLoanSetupStore } from "@/lib/loan-setup-store";

export const Route = createFileRoute("/loan/applications/")({
  component: LoanApplicationList,
});

function LoanApplicationList() {
  const applications = useLoanApplicationStore((s) => s.applications);
  const setups = useLoanSetupStore((s) => s.setups);
  const rows = useMemo(
    () => getLoanApplicationList(applications),
    [applications],
  );

  return (
    <div className="p-6 font-sans max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Loan Applications</h1>
          <p className="text-sm text-gray-700">
            Applications saved against configured loan products.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/loan/applications/create"
            className="text-sm border px-3 rounded hover:bg-gray-50"
          >
            New application
          </Link>
          <Link
            to="/loan/setup"
            className="text-sm border px-3 rounded hover:bg-gray-50"
          >
            Configure loan
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
          No applications yet. Create a loan setup, then start an application.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Application #</th>
                <th className="px-3 py-2 font-semibold">Beneficiary</th>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Credit score</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const score = row.creditScore ?? null;
                const max = row.creditMax ?? null;

                return (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">
                      {row.applicationNo}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.beneficiaryName}</div>
                      <div className="text-xs text-gray-600">{row.nationalId}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.productName ?? ""}</div>
                      <div className="text-xs text-gray-600">{row.productCode}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.requestedAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {score === null ? "—" : max ? `${score} / ${max}` : `${score}`}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to="/loan/applications/$applicationId"
                        params={{ applicationId: row.id }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
