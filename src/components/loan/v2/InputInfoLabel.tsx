import { Info } from "lucide-react";

export function InputInfoLabel({ label, info }: { label: string; info: string }) {
	return (
		<div className="flex items-center gap-1 text-sm font-medium text-slate-700">
			<span>{label}</span>
			<span className="relative inline-flex items-center">
				<button
					type="button"
					aria-label={info}
					className="peer inline-flex items-center justify-center text-slate-500 cursor-help"
				>
					<Info className="h-3.5 w-3.5" />
				</button>
				<span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100">
					{info}
				</span>
			</span>
		</div>
	);
}
