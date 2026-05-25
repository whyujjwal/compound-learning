"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";

const PRIMARY = [
  { href: "/", label: "Today" },
  { href: "/coach", label: "Coach" },
  { href: "/curriculum", label: "Roadmap" },
];

const SECONDARY = [
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

const MANAGE = [
  { href: "/tracks", label: "Tracks" },
  { href: "/materials", label: "Materials" },
  { href: "/cards", label: "Cards" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={active ? "active" : undefined}>
      {label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        Compound
      </Link>
      <nav className="nav-primary">
        {PRIMARY.map((l) => (
          <NavLink key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </nav>

      <div className="nav-divider" />

      <nav className="nav-secondary">
        {SECONDARY.map((l) => (
          <NavLink key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-manage-label">Manage</div>
        <nav className="nav-manage">
          {MANAGE.map((l) => (
            <NavLink key={l.href} {...l} active={isActive(l.href)} />
          ))}
        </nav>
        <div className="sidebar-status-row">
          <StatusPill />
          <span className="sidebar-hint">
            <kbd>?</kbd>
          </span>
        </div>
      </div>
    </aside>
  );
}
