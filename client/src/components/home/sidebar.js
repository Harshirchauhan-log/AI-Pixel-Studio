"use client";

import { saveDesign } from "@/services/design-service";
import { useEditorStore } from "@/store";
import { CreditCard, FolderOpen, Home, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const menuItems = [
  {
    icon: <Home className="h-5 w-5" />,
    label: "Home",
    active: true,
  },
  {
    icon: <FolderOpen className="h-5 w-5" />,
    label: "Projects",
    active: false,
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    label: "Billing",
    active: false,
  },
];

function SideBar() {
  const router = useRouter();
  const { setShowPremiumModal, setShowDesignsModal } = useEditorStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNewDesign = async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);

      const initialDesignData = {
        name: "Untitled design - Youtube Thumbnail",
        canvasData: null,
        width: 825,
        height: 465,
        category: "youtube_thumbnail",
      };

      const newDesign = await saveDesign(initialDesignData);

      if (newDesign?.success) {
        router.push(`/editor/${newDesign?.data?._id}`);
      } else {
        throw new Error("Failed to create new design");
      }
    } catch (e) {
      toast.error(e.message || "Failed to create new design");
      setIsCreating(false);
    }
  };
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around bg-black px-3 text-white md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-[72px] md:flex-col md:justify-start md:py-4">
      <button
        type="button"
        disabled={isCreating}
        onClick={handleCreateNewDesign}
        aria-label={isCreating ? "Creating design" : "Create new design"}
        className="flex min-h-11 min-w-11 flex-col items-center justify-center rounded-[8px] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] md:min-h-0"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0066cc] text-white md:h-11 md:w-11">
          <Plus
            className={`h-5 w-5 ${isCreating ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 text-center text-[11px] font-normal leading-none text-white/80">
          Create
        </span>
      </button>
      <nav
        aria-label="Primary workspace navigation"
        className="flex flex-1 items-center justify-around md:mt-8 md:w-full md:flex-none md:flex-col md:space-y-3"
      >
        {menuItems.map((menuItem) => (
          <button
            type="button"
            onClick={
              menuItem.label === "Billing"
                ? () => setShowPremiumModal(true)
                : menuItem.label === "Projects"
                ? () => setShowDesignsModal(true)
                : () => router.push("/")
            }
            key={menuItem.label}
            aria-label={
              menuItem.label === "Home"
                ? "Go to home"
                : `Open ${menuItem.label.toLowerCase()}`
            }
            className="flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] md:w-full"
            aria-current={menuItem.active ? "page" : undefined}
          >
            <span
              className={`flex rounded-lg px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white md:w-full md:flex-col md:items-center md:rounded-none md:px-0 md:py-3 ${
                menuItem.active ? "bg-white/10 text-white" : ""
              }`}
            >
              <span className="relative flex justify-center">
                {menuItem.icon}
              </span>
              <span className="mt-1 text-[11px] font-normal leading-none">
                {menuItem.label}
              </span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default SideBar;
