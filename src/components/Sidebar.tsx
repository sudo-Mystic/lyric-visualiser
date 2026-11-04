import { ListMusic, MonitorSpeaker, Palette } from "lucide-react";
import type { ReactNode } from "react";
import type { PanelTab } from "../lib/appTypes";
import { canvasFormatLabel } from "../lib/render/formats";
import type { CanvasFormat } from "../lib/types";
import { cn } from "./ui";

const tabs: Array<{ value: PanelTab; label: string; icon: typeof ListMusic }> = [
  { value: "source", label: "Source", icon: MonitorSpeaker },
  { value: "lyrics", label: "Lyrics", icon: ListMusic },
  { value: "look", label: "Look", icon: Palette },
];

export function PanelTabs({
  tab,
  onChange,
  compact = false,
}: {
  tab: PanelTab;
  onChange: (tab: PanelTab) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 border-b border-edge/80", compact ? "" : "shrink-0")}>
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = item.value === tab;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 font-medium transition-colors",
              compact ? "h-11 text-[11px]" : "h-[52px] text-[11px]",
              active
                ? "bg-white/[0.025] text-bone"
                : "text-dim hover:bg-white/[0.015] hover:text-muted",
            )}
          >
            <Icon className={cn("size-3.5", active ? "text-blood" : "text-dim")} />
            {item.label}
            {active ? (
              <span className="absolute inset-x-4 bottom-0 h-px bg-blood shadow-[0_0_12px_rgba(255,42,48,0.8)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({
  tab,
  onTabChange,
  canvasFormat,
  children,
}: {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  canvasFormat: CanvasFormat;
  children: ReactNode;
}) {
  return (
    <aside className="hidden min-h-0 w-[350px] shrink-0 flex-col border-r border-edge/80 bg-panel/70 backdrop-blur-xl lg:flex xl:w-[376px]">
      <PanelTabs tab={tab} onChange={onTabChange} />
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-edge/60 px-4 font-mono text-[8px] uppercase tracking-[0.14em] text-dim/60">
        <span>Local studio</span>
        <span>{canvasFormatLabel(canvasFormat)}</span>
      </div>
    </aside>
  );
}
