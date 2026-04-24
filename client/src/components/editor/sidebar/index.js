"use client";

import {
  ArrowLeft,
  ChevronLeft,
  Grid,
  Pencil,
  Settings,
  Sparkle,
  Type,
  Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ElementsPanel = dynamic(() => import("./panels/elements"), {
  ssr: false,
});
const TextPanel = dynamic(() => import("./panels/text"), { ssr: false });
const UploadPanel = dynamic(() => import("./panels/upload"), { ssr: false });
const DrawingPanel = dynamic(() => import("./panels/draw"), { ssr: false });
const SettingsPanel = dynamic(() => import("./panels/settings"), {
  ssr: false,
});
const AiPanel = dynamic(() => import("./panels/ai"), { ssr: false });

function Sidebar() {
  const searchParams = useSearchParams();
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState(null);

  const sidebarItems = useMemo(() => [
    {
      id: "elements",
      icon: Grid,
      label: "Elements",
      panel: () => <ElementsPanel />,
    },
    {
      id: "text",
      icon: Type,
      label: "Text",
      panel: () => <TextPanel />,
    },
    {
      id: "uploads",
      icon: Upload,
      label: "Uploads",
      panel: () => <UploadPanel />,
    },
    {
      id: "draw",
      icon: Pencil,
      label: "Draw",
      panel: () => <DrawingPanel />,
    },
    {
      id: "ai",
      icon: Sparkle,
      label: "AI",
      panel: () => <AiPanel />,
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      panel: () => <SettingsPanel />,
    },
  ], []);

  useEffect(() => {
    const requestedPanel = searchParams.get("panel");
    const hasRequestedPanel = sidebarItems.some(
      (item) => item.id === requestedPanel
    );

    if (hasRequestedPanel) {
      setActiveSidebar(requestedPanel);
      setIsPanelCollapsed(false);
    }
  }, [searchParams, sidebarItems]);

  const handleItemClick = (id) => {
    if (id === activeSidebar && !isPanelCollapsed) return;

    setActiveSidebar(id);
    setIsPanelCollapsed(false);
  };

  const closeSecondaryPanel = () => {
    setActiveSidebar(null);
  };

  const togglePanelCollapse = (e) => {
    e.stopPropagation();
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  const activeItem = sidebarItems.find((item) => item.id === activeSidebar);

  return (
    <div className="flex h-full">
      <aside className="sidebar">
        {sidebarItems.map((item) => (
          <button
            type="button"
            onClick={() => handleItemClick(item.id)}
            key={item.id}
            className={`sidebar-item ${
              activeSidebar === item.id ? "active" : ""
            }`}
            aria-current={activeSidebar === item.id ? "page" : undefined}
          >
            <item.icon className="sidebar-item-icon h-5 w-5" aria-hidden="true" />
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </aside>
      {activeSidebar && (
        <div
          className={`secondary-panel ${isPanelCollapsed ? "collapsed" : ""}`}
          style={{
            width: isPanelCollapsed ? "0" : "320px",
            opacity: isPanelCollapsed ? 0 : 1,
            overflow: isPanelCollapsed ? "hidden" : "visible",
          }}
        >
          <div className="panel-header">
            <button
              type="button"
              className="back-button"
              onClick={closeSecondaryPanel}
              aria-label="Close panel"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="panel-title">{activeItem.label}</span>
          </div>
          <div className="panel-content">{activeItem?.panel()}</div>
          <button
            type="button"
            className="collapse-button"
            onClick={togglePanelCollapse}
            aria-label={isPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
