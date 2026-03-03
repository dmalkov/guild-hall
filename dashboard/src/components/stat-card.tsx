interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="border-2 border-guild-border bg-guild-surface p-4">
      <div className="text-guild-muted text-xs mb-1">{label}</div>
      <div className="font-pixel text-lg text-guild-gold">{value}</div>
      {sub && <div className="text-guild-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}
