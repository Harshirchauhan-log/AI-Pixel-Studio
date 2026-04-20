"use client";

import { designTypes } from "@/config";
import { saveDesign } from "@/services/design-service";
import { useEditorStore } from "@/store";
import {
  Heart,
  Image,
  Loader,
  Palette,
  Printer,
  Sparkles,
  Sticker,
  Type,
  Upload,
  Wand2,
  Youtube,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const designTypeIcons = {
  Heart,
  Image,
  Palette,
  Printer,
  Sparkles,
  Sticker,
  Type,
  Upload,
  Wand2,
  Youtube,
};

function DesignTypes() {
  const { userDesigns, userSubscription } = useEditorStore();
  const [currentSelectedType, setCurrentSelectedType] = useState(-1);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateNewDesign = async (selectedType, index) => {
    if (!selectedType || loading) return;
    setCurrentSelectedType(index);

    if (userDesigns?.length >= 5 && !userSubscription?.isPremium) {
      toast.error("Please upgrade to premium!", {
        description: "You need to upgrade to premium to create more designs",
      });

      return;
    }
    try {
      setLoading(true);

      const initialDesignData = {
        name:
          selectedType.label === "Upload"
            ? "Untitled upload design"
            : selectedType.label,
        canvasData: null,
        width: selectedType.width,
        height: selectedType.height,
        category: selectedType.label,
      };

      const newDesign = await saveDesign(initialDesignData);

      if (newDesign?.success) {
        const panelQuery = selectedType.panel
          ? `?panel=${encodeURIComponent(selectedType.panel)}`
          : "";
        router.push(`/editor/${newDesign?.data?._id}${panelQuery}`);
      } else {
        throw new Error("Failed to create new design");
      }
    } catch (e) {
      toast.error(e.message || "Failed to create new design");
      setLoading(false);
    }
  };
  return (
    <section className="bg-[#f5f5f7] px-6 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 text-center">
          <h2 className="apple-display text-[34px] text-[#1d1d1f] md:text-[40px]">
            Choose what you want to make.
          </h2>
          <p className="mt-2 text-[17px] text-[#333]">
            One click creates the canvas and opens the right tool.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {designTypes.map((type, index) => {
            const Icon = designTypeIcons[type.icon] || Sparkles;
            const isCreating = loading && currentSelectedType === index;

            return (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleCreateNewDesign(type, index)}
                key={type.label}
                aria-label={`Create ${type.label}`}
                className="group flex min-h-[144px] cursor-pointer flex-col rounded-[12px] border border-black/10 bg-white p-4 text-left transition-colors hover:border-[#0066cc]/60 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#0066cc] group-hover:bg-[#0066cc] group-hover:text-white [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-current">
                    {isCreating ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-[12px] font-medium capitalize text-[#6e6e73]">
                    {isCreating ? "Creating..." : type.panel || "editor"}
                  </span>
                </div>
                <span className="text-[16px] font-semibold leading-tight tracking-[-0.01em] text-[#1d1d1f]">
                  {type.label}
                </span>
                <span className="mt-1 text-[12px] font-medium text-[#6e6e73]">
                  {type.width} x {type.height}
                </span>
                <span className="mt-auto pt-4 text-[13px] leading-5 text-[#333]">
                  {type.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default DesignTypes;
