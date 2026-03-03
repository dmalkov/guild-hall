import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? "text-gray-400 border-gray-400";
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-pixel ${colors}`}>
      {status}
    </span>
  );
}
