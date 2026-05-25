"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Shell, BareShell } from "./Shell";

/**
 * Wraps every route in the workspace shell — except focused routes that
 * want a bare canvas (currently /session/*).
 *
 * Pages populate the right panel and command-palette actions via the
 * `useShell` context (see `setRightPanel` / `setActions`).
 */
export function ShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (pathname === "/login" || pathname.startsWith("/session")) {
    return <BareShell>{children}</BareShell>;
  }
  return <Shell>{children}</Shell>;
}
