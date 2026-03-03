import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "~" },
  { href: "/agents", label: "Agents", icon: "@" },
  { href: "/runs", label: "Runs", icon: ">" },
  { href: "/signals", label: "Signals", icon: "!" },
];

export function Sidebar() {
  return (
    <aside className="w-52 shrink-0 border-r-2 border-guild-border bg-guild-surface flex flex-col">
      <div className="p-4 border-b-2 border-guild-border">
        <h1 className="font-pixel text-guild-gold text-xs leading-relaxed">
          THE GUILD
          <br />
          HALL
        </h1>
      </div>
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 text-guild-muted hover:text-guild-text hover:bg-guild-border/30 transition-colors"
          >
            <span className="font-pixel text-xs text-guild-gold">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t-2 border-guild-border text-guild-muted text-xs">
        v0.1.0
      </div>
    </aside>
  );
}
