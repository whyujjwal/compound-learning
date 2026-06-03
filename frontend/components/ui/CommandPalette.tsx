"use client";

import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track, Material } from "@/lib/api";
import { api } from "@/lib/api";

export function CommandPalette({
  open,
  onOpenChange,
  tracks,
  onPushMore,
  onRefreshNudge,
  onStartFirstBlock,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tracks: Track[];
  onPushMore?: (slug: string) => void;
  onRefreshNudge?: () => void;
  onStartFirstBlock?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isQuestion = e.key === "?" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement);
      if (isCmdK || isQuestion) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lazy-load materials only when palette opens
  useEffect(() => {
    if (!open) return;
    if (materials.length > 0) return;
    api.getMaterials().then(setMaterials).catch(() => {});
  }, [open, materials.length]);

  const filteredMaterials = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return materials.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8);
  }, [query, materials]);

  function go(href: string) {
    router.push(href);
    onOpenChange(false);
    setQuery("");
  }

  function act(fn?: () => void) {
    if (fn) fn();
    onOpenChange(false);
    setQuery("");
  }

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className="cmdk-shell"
      shouldFilter
    >
      <Command.Input
        placeholder="Jump to a track, material, or run a command…"
        value={query}
        onValueChange={setQuery}
      />
      <Command.List>
        <Command.Empty>Nothing matched.</Command.Empty>

        <Command.Group heading="Jump">
          <Command.Item value="today" onSelect={() => go("/")}>
            <span className="cmdk-item-icon">◐</span>
            Today
          </Command.Item>
          <Command.Item value="library syllabi my library" onSelect={() => go("/library")}>
            <span className="cmdk-item-icon">▦</span>
            Library
          </Command.Item>
          <Command.Item value="explore catalog public roadmaps" onSelect={() => go("/explore")}>
            <span className="cmdk-item-icon">◎</span>
            Explore
          </Command.Item>
          <Command.Item value="coach ask ai" onSelect={() => go("/")}>
            <span className="cmdk-item-icon">◇</span>
            Coach
          </Command.Item>
          <Command.Item value="new syllabus create library" onSelect={() => go("/library/new")}>
            <span className="cmdk-item-icon">✦</span>
            New syllabus
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Manage">
          <Command.Item value="stats analytics progress" onSelect={() => go("/progress")}>
            <span className="cmdk-item-icon">▤</span>
            Progress
          </Command.Item>
          <Command.Item value="settings" onSelect={() => go("/settings")}>
            <span className="cmdk-item-icon">⚙</span>
            Settings
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Syllabi">
          {tracks.map((t) => (
            <Command.Item
              key={t.id}
              value={`syllabus ${t.name} ${t.slug}`}
              onSelect={() => go(`/library/${t.slug}`)}
            >
              <span className="cmdk-item-icon" style={{ color: t.color }}>●</span>
              {t.name}
            </Command.Item>
          ))}
        </Command.Group>

        {filteredMaterials.length > 0 && (
          <Command.Group heading="Materials">
            {filteredMaterials.map((m) => (
              <Command.Item
                key={m.id}
                value={`material ${m.title}`}
                onSelect={() => {
                  if (m.external_url) window.open(m.external_url, "_blank", "noopener,noreferrer");
                  else go(`/library`);
                }}
              >
                <span className="cmdk-item-icon">·</span>
                {m.title}
                <span className="cmdk-item-shortcut">{m.estimated_minutes}m</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Actions">
          {onStartFirstBlock && (
            <Command.Item value="start first block" onSelect={() => act(onStartFirstBlock)}>
              <span className="cmdk-item-icon">▸</span>
              Start today&apos;s first block
            </Command.Item>
          )}
          {onRefreshNudge && (
            <Command.Item value="refresh nudge" onSelect={() => act(onRefreshNudge)}>
              <span className="cmdk-item-icon">↺</span>
              Refresh today&apos;s nudge
            </Command.Item>
          )}
          {tracks.map((t) =>
            onPushMore ? (
              <Command.Item
                key={`push-${t.slug}`}
                value={`push more ${t.name}`}
                onSelect={() => act(() => onPushMore(t.slug))}
              >
                <span className="cmdk-item-icon" style={{ color: t.color }}>+</span>
                Push more from {t.name}
              </Command.Item>
            ) : null
          )}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
