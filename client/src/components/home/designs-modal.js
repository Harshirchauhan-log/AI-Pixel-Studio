"use client";

import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Sparkles } from "lucide-react";
import DesignList from "./design-list";

function DesignModal({
  isOpen,
  onClose,
  userDesigns,
  setShowDesignsModal,
  userDesignsLoading,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={
          "max-h-[calc(100vh-2rem)] min-h-[420px] gap-0 overflow-auto rounded-[18px] border-black/10 bg-[#f5f5f7] p-0 sm:max-w-[1100px]"
        }
      >
        <div className="flex min-h-[420px] flex-col">
          <div className="px-6 pb-2 pt-6">
            <DialogTitle
              className={
                "apple-display flex items-center justify-center text-center text-[34px] text-[#1d1d1f]"
              }
            >
              <Sparkles className="mr-2 h-6 w-6 text-[#0066cc]" />
              All Designs
            </DialogTitle>
          </div>
          <DesignList
            setShowDesignsModal={setShowDesignsModal}
            isModalView={true}
            listOfDesigns={userDesigns}
            isLoading={userDesignsLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DesignModal;
