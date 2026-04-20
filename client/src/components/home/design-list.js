"use client";

import { useRouter } from "next/navigation";
import DesignPreview from "./design-preview";
import { Loader2, Trash2 } from "lucide-react";
import { deleteDesign, getUserDesigns } from "@/services/design-service";
import { useEditorStore } from "@/store";
import { toast } from "sonner";

function DesignList({
  listOfDesigns,
  isLoading,
  isModalView,
  setShowDesignsModal,
  emptyMessage = "No designs yet.",
}) {
  const router = useRouter();
  const { setUserDesigns } = useEditorStore();

  async function fetchUserDesigns() {
    const result = await getUserDesigns();

    if (result?.success) setUserDesigns(result?.data);
  }

  const handleDeleteDesign = async (getCurrentDesignId) => {
    try {
      const response = await deleteDesign(getCurrentDesignId);

      if (response.success) {
        fetchUserDesigns();
        toast.success("Design deleted");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete design");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0066cc]" />
      </div>
    );
  }

  return (
    <div
      className={`${
        isModalView
          ? "grid-cols-[repeat(auto-fit,minmax(220px,260px))] justify-center p-6"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      } grid gap-5`}
    >
      {!listOfDesigns.length && (
        <div className="col-span-full rounded-[18px] border border-black/10 bg-[#f5f5f7] px-6 py-12 text-center text-[17px] text-[#6e6e73]">
          {emptyMessage}
        </div>
      )}
      {listOfDesigns.map((design) => (
        <div
          key={design._id}
          className="group cursor-pointer rounded-[18px] border border-black/10 bg-white p-3 transition-colors hover:border-black/20"
        >
          <button
            type="button"
            onClick={() => {
              router.push(`/editor/${design?._id}`);
              if (isModalView) setShowDesignsModal(false);
            }}
            className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#f5f5f7] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            aria-label={`Open design ${design.name}`}
          >
            {design?.canvasData && (
              <DesignPreview key={design._id} design={design} />
            )}
          </button>
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
              {design.name}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteDesign(design?._id);
              }}
              aria-label={`Delete design ${design.name}`}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] md:h-8 md:w-8"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DesignList;
