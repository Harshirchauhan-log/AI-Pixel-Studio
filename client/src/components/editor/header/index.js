"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/store";
import {
  ChevronDown,
  Download,
  Eye,
  Loader2,
  LogOut,
  Pencil,
  Save,
  Star,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ExportModal = dynamic(() => import("../export"), { ssr: false });

const handleLogout = () => {
  signOut();
};

function Header() {
  const {
    isEditing,
    setIsEditing,
    name,
    setName,
    canvas,
    saveStatus,
    markAsModified,
    designId,
    userDesigns,
    userSubscription,
    setShowPremiumModal,
  } = useEditorStore();
  const { data: session } = useSession();
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!canvas) return;
    canvas.selection = isEditing;
    canvas.getObjects().forEach((obj) => {
      obj.selectable = isEditing;
      obj.evented = isEditing;
    });
  }, [canvas, isEditing]);

  useEffect(() => {
    if (!canvas || !designId) return;
    markAsModified();
  }, [name, canvas, designId, markAsModified]);

  const handleExport = () => {
    if (userDesigns?.length >= 5 && !userSubscription?.isPremium) {
      toast.error("Please upgrade to premium!", {
        description: "You need to upgrade to premium to create more designs",
      });

      return;
    }
    setShowExportModal(true);
  };

  return (
    <header className="header-gradient header flex h-14 items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <Link href={"/"} className="text-[18px] font-semibold tracking-[-0.01em] text-white">
          AI Pixel Studio
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Current mode: ${
                isEditing ? "Editing" : "Viewing"
              }. Change editor mode`}
              className="header-button flex items-center text-white/90"
            >
              <span>{isEditing ? "Editing" : "Viewing"}</span>
              <ChevronDown className="ml-1 h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Editing</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditing(false)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Viewing</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          className={
            "relative flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          }
          aria-label={`Save status: ${saveStatus}`}
          title={saveStatus !== "Saving..." ? "Save" : saveStatus}
          disabled={saveStatus === "Saving..."}
        >
          {saveStatus === "Saving..." ? (
            <div className="relative flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="sr-only">Saving...</span>
            </div>
          ) : (
            <Save
              className={cn("h-5 w-5", saveStatus === "Saved" && "text-white")}
            />
          )}

          {saveStatus === "Saving..." && (
            <span className="absolute right-0 top-0 h-2 w-2 animate-pulse rounded-full bg-[#2997ff]" />
          )}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="header-button relative ml-3 text-white/90"
          aria-label="Export design"
          title="Export"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
      <div className="flex max-w-md flex-1 justify-center px-4">
        <Input
          className="header-title-input w-full border-white/20 bg-white/10 text-center text-white placeholder:text-white/50 focus-visible:border-white/50 focus-visible:ring-white/10"
          aria-label="Design name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setShowPremiumModal(true)}
          aria-label={
            userSubscription?.isPremium
              ? "View premium subscription"
              : "Open premium upgrade"
          }
          className="upgrade-button flex h-9 items-center rounded-full bg-white/10 px-3 text-[14px] text-white transition-colors hover:bg-white/20"
        >
          <Star className="mr-1 h-4 w-4 text-[#2997ff]" />
          <span>
            {!userSubscription?.isPremium
              ? "Upgrade"
              : "Premium"}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            >
              <Avatar>
                <AvatarFallback>
                  {session?.user?.name?.[0] || "U"}
                </AvatarFallback>
                <AvatarImage
                  src={session?.user?.image || "/placeholder-user.svg"}
                  alt={session?.user?.name || "User profile"}
                />
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={handleLogout}
              className={"cursor-pointer"}
            >
              <LogOut className="mr-2 w-4 h-4" />
              <span className="font-semibold">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showExportModal && (
        <ExportModal isOpen={showExportModal} onClose={setShowExportModal} />
      )}
    </header>
  );
}

export default Header;
