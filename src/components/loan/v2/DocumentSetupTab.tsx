import type { SetStateAction } from "react";
import { useState } from "react";
import DocumentRequirementsSection, {
	createDocumentRequirementDocument,
	createDocumentRequirementItem,
	type DocumentRequirementItem,
} from "@/components/loan/DocumentRequirementsSection";
import { DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/loan-setup-store";
import type { LoanSecurityType } from "./setup-types";

type DocumentSetupTabProps = {
	loanSecurity: LoanSecurityType;
};

const collateralDocumentType = "COLLATERAL";
const collateralDocumentTypeId = `DOC-${collateralDocumentType}`;

const enforceSecuredCollateral = (
	items: DocumentRequirementItem[],
	loanSecurity: LoanSecurityType,
) => {
	if (loanSecurity !== "SECURED") return items;

	let changed = false;
	const nextItems = items.map((item) => {
		const docIndex = item.documents.findIndex(
			(doc) => doc.documentTypeId === collateralDocumentTypeId,
		);

		if (docIndex === -1) {
			changed = true;
			return {
				...item,
				documents: [
					...item.documents,
					createDocumentRequirementDocument(collateralDocumentType, {
						collateralRequired: true,
						isMandatory: true,
					}),
				],
			};
		}

		const existing = item.documents[docIndex];
		if (existing.collateralRequired === true && existing.isMandatory === true) {
			return item;
		}

		changed = true;
		return {
			...item,
			documents: item.documents.map((doc, idx) =>
				idx === docIndex
					? {
							...doc,
							collateralRequired: true,
							isMandatory: true,
						}
					: doc,
			),
		};
	});

	return changed ? nextItems : items;
};

export function DocumentSetupTab({
	loanSecurity,
}: Readonly<DocumentSetupTabProps>) {
	const [documentRequirements, setDocumentRequirements] = useState<
		DocumentRequirementItem[]
	>(() =>
		enforceSecuredCollateral(
			[createDocumentRequirementItem("LOW", DEFAULT_REQUIRED_DOCUMENTS)],
			loanSecurity,
		),
	);

	const handleChangeRequirements = (
		updater: SetStateAction<DocumentRequirementItem[]>,
	) => {
		setDocumentRequirements((current) => {
			const next = typeof updater === "function" ? updater(current) : updater;
			return enforceSecuredCollateral(next, loanSecurity);
		});
	};

	return (
		<section className="space-y-4">
			<DocumentRequirementsSection
				riskResult={null}
				requirements={documentRequirements}
				onChangeRequirements={handleChangeRequirements}
			/>
		</section>
	);
}
