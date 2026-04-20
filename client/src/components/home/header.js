"use client";

import { Crown, FolderOpen, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useEditorStore } from "@/store";

const handleLogout = async () => {
  await signOut();
};

function Header() {
  const { data: session } = useSession();
  const { userDesigns, userSubscription } = useEditorStore();
  const projectCount = userDesigns?.length || 0;
  const planLabel = userSubscription?.isPremium ? "Premium" : "Free";

  return (
    <header className="apple-frosted fixed left-0 right-0 top-0 z-10 flex h-[52px] items-center border-b border-black/10 px-4 md:left-[72px] md:px-6">
      <div className="text-[21px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
        AI Pixel Studio
      </div>
      <div className="mx-auto hidden items-center gap-2 md:flex">
        <div className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[13px] font-medium text-[#333]">
          <FolderOpen className="h-4 w-4 text-[#0066cc]" />
          {projectCount} {projectCount === 1 ? "project" : "projects"}
        </div>
        <div className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[13px] font-medium text-[#333]">
          <Crown className="h-4 w-4 text-[#0066cc]" />
          {planLabel} plan
        </div>
      </div>
      <div className="ml-4 flex items-center gap-4">
        <div className="flex cursor-pointer items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open account menu"
                className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-1"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {session?.user?.name?.[0] || "U"}
                  </AvatarFallback>
                  <AvatarImage
                    src={session?.user?.image || "/placeholder-user.svg"}
                    alt={session?.user?.name || "User profile"}
                  />
                </Avatar>
                <span className="hidden max-w-[140px] truncate pr-2 text-[14px] font-normal text-[#333] lg:block">
                  {session?.user?.name || "User"}
                </span>
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
      </div>
    </header>
  );
}

export default Header;
