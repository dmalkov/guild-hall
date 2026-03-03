import { XP_PER_LEVEL } from "@/lib/constants";

interface XpBarProps {
  xp: number;
  level: number;
}

export function XpBar({ xp, level }: XpBarProps) {
  const xpInLevel = xp % XP_PER_LEVEL;
  const needed = XP_PER_LEVEL;
  const pct = Math.min((xpInLevel / needed) * 100, 100);
  const segments = 10;
  const filled = Math.round((pct / 100) * segments);

  return (
    <div className="flex items-center gap-2">
      <span className="text-guild-muted text-xs">Lv{level}</span>
      <div className="flex gap-px flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 border border-guild-border ${
              i < filled ? "bg-guild-gold" : "bg-guild-bg"
            }`}
          />
        ))}
      </div>
      <span className="text-guild-muted text-xs">
        {xpInLevel}/{needed}
      </span>
    </div>
  );
}
