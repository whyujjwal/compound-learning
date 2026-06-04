"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/* ─── Context ────────────────────────────────────────────── */
type TabsContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used inside <Tabs>");
  return ctx;
}

/* ─── Tabs root ──────────────────────────────────────────── */
interface TabsProps {
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
}

export function Tabs({ defaultTab, activeTab: controlledTab, onTabChange, children }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? "");

  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

/* ─── Tab list ───────────────────────────────────────────── */
export function TabList({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--hairline)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Tab trigger ────────────────────────────────────────── */
interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const active = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`tabpanel-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--text)" : "var(--muted)",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        marginBottom: -1, // overlap the TabList border-bottom
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "color 100ms, border-color 100ms",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }
      }}
    >
      {children}
    </button>
  );
}

/* ─── Tab panel ──────────────────────────────────────────── */
interface TabPanelProps {
  id: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function TabPanel({ id, children, style }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      style={style}
    >
      {children}
    </div>
  );
}
