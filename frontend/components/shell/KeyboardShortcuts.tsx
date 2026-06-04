"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShortcutsHelp } from "./ShortcutsHelp";

/* ─── helpers ─────────────────────────────────────────────── */

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function isModalOpen(): boolean {
  // cmdk overlay or any open [role="dialog"]
  return (
    document.querySelector(".cmdk-overlay") !== null ||
    document.querySelector('[role="dialog"]') !== null
  );
}

/* ─── props ───────────────────────────────────────────────── */
interface KeyboardShortcutsProps {
  paletteOpen: boolean;
  onOpenPalette: () => void;
  shortcutsOpen: boolean;
  onOpenShortcuts: () => void;
  onCloseShortcuts: () => void;
}

/* ─── component ───────────────────────────────────────────── */
export function KeyboardShortcuts({
  paletteOpen,
  onOpenPalette,
  shortcutsOpen,
  onOpenShortcuts,
  onCloseShortcuts,
}: KeyboardShortcutsProps) {
  const router = useRouter();

  // "g" chord state
  const gPendingRef = useRef(false);
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearGPending() {
    gPendingRef.current = false;
    if (gTimeoutRef.current !== null) {
      clearTimeout(gTimeoutRef.current);
      gTimeoutRef.current = null;
    }
  }

  // Listen for the custom event dispatched by the command palette's
  // "Show keyboard shortcuts" item.
  useEffect(() => {
    function onCustomEvent() {
      onOpenShortcuts();
    }
    window.addEventListener("compound:open-shortcuts", onCustomEvent);
    return () => window.removeEventListener("compound:open-shortcuts", onCustomEvent);
  }, [onOpenShortcuts]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // ── ⌘K / Ctrl+K ────────────────────────────────────────────
      // The palette's own useEffect is authoritative for this binding.
      // We only handle ⌘K here when the palette is closed AND no
      // other handler has already prevented default, so we defer:
      // just open when closed. The palette handles toggle/close.
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        if (!paletteOpen) {
          e.preventDefault();
          clearGPending();
          onOpenPalette();
        }
        // When paletteOpen, the palette's own listener handles it.
        return;
      }

      // ── When a modal (palette, dialog) is open, ignore everything
      // except we already handle the shortcuts dialog's Esc in the
      // Dialog primitive itself.
      if (shortcutsOpen) return;
      if (isModalOpen()) {
        clearGPending();
        return;
      }

      // ── Block shortcuts while typing ────────────────────────────
      if (isTypingTarget(e.target)) {
        clearGPending();
        return;
      }

      // ── ? → open shortcuts help ─────────────────────────────────
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        clearGPending();
        onOpenShortcuts();
        return;
      }

      // ── g chord ─────────────────────────────────────────────────
      if (gPendingRef.current) {
        let dest: string | null = null;
        switch (e.key.toLowerCase()) {
          case "h": dest = "/"; break;
          case "l": dest = "/library"; break;
          case "e": dest = "/explore"; break;
          case "p": dest = "/profile"; break;
        }
        clearGPending();
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        gPendingRef.current = true;
        gTimeoutRef.current = setTimeout(() => {
          gPendingRef.current = false;
          gTimeoutRef.current = null;
        }, 1000);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearGPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen, shortcutsOpen, onOpenPalette, onOpenShortcuts, router]);

  return (
    <ShortcutsHelp
      open={shortcutsOpen}
      onOpenChange={(v) => (v ? onOpenShortcuts() : onCloseShortcuts())}
    />
  );
}
