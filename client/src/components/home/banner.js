"use client";

import { ChevronRight, Loader, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { saveDesign } from "@/services/design-service";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/store";
import { toast } from "sonner";

function Banner() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { userSubscription, userDesigns, setShowDesignsModal } =
    useEditorStore();

  const handleCreateNewDesign = async () => {
    if (userDesigns?.length >= 5 && !userSubscription?.isPremium) {
      toast.error("Please upgrade to premium!", {
        description: "You need to upgrade to premium to create more designs",
      });

      return;
    }
    if (loading) return;
    try {
      setLoading(true);

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
      setLoading(false);
    }
  };

  const handleOpenAiDraft = () => {
    document.getElementById("ai-draft")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section className="bg-white px-6 pb-16 pt-10 text-center md:px-10 md:pb-20">
      <div className="mx-auto max-w-[1120px]">
        <p className="mb-3 text-[14px] font-semibold tracking-[-0.01em] text-[#6e6e73]">
          AI Pixel Studio
        </p>
        <h1 className="apple-display mx-auto max-w-[960px] text-[42px] text-[#1d1d1f] sm:text-[56px]">
          Design faster, without losing control.
        </h1>
        <p className="mx-auto mt-4 max-w-[680px] text-[21px] font-normal leading-[1.19] tracking-[-0.01em] text-[#333] sm:text-[28px]">
          Start with the right canvas, bring in AI when you need a first draft,
          and finish every detail yourself.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={handleCreateNewDesign}
            disabled={loading}
            className="bg-[#0066cc] text-[17px] text-white hover:bg-[#0066cc]/90"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            Start Designing
          </Button>
          <button
            type="button"
            onClick={handleOpenAiDraft}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-[#f5f5f7] px-[22px] text-[17px] font-normal text-[#1d1d1f] hover:bg-[#ececf0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            <Sparkles className="h-4 w-4 text-[#0066cc]" />
            AI Draft
          </button>
          <button
            type="button"
            onClick={() => setShowDesignsModal(true)}
            className="inline-flex h-11 items-center rounded-full border border-[#0066cc] px-[22px] text-[17px] font-normal text-[#0066cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
          >
            Projects
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default Banner;
