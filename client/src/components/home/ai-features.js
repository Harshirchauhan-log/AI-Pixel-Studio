"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { generateImageFromAI } from "@/services/upload-service";
import { saveDesign } from "@/services/design-service";
import { useEditorStore } from "@/store";
import { useRouter } from "next/navigation";

const YOUTUBE_THUMBNAIL_WIDTH = 825;
const YOUTUBE_THUMBNAIL_HEIGHT = 465;

const MODES = {
  title: {
    title: "Generate thumbnail from video title",
    label: "Video title",
    placeholder: "e.g. I Tried Building A SaaS App In 7 Days",
    multiline: false,
    getPrompt: (value) =>
      `Create a high-converting YouTube thumbnail for a video titled "${value}". Make it bold, colorful, dramatic, modern, and clickable. No unreadable text.`,
  },
  custom: {
    title: "Generate custom thumbnail image",
    label: "Thumbnail prompt",
    placeholder:
      "Describe the thumbnail you want, including subject, colors, mood, and style.",
    multiline: true,
    getPrompt: (value) =>
      `Create a 16:9 YouTube thumbnail image. ${value}. Make it polished, bold, high contrast, and optimized for clicks.`,
  },
};

function getImageDimensions(imageUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 1024,
        height: image.naturalHeight || image.height || 1024,
      });
    };

    image.onerror = () => {
      resolve({ width: 1024, height: 1024 });
    };

    image.src = imageUrl;
  });
}

async function buildThumbnailCanvasData(imageUrl) {
  const imageSize = await getImageDimensions(imageUrl);

  return JSON.stringify({
    version: "6.6.2",
    objects: [
      {
        type: "Image",
        version: "6.6.2",
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        width: imageSize.width,
        height: imageSize.height,
        fill: "rgb(0,0,0)",
        stroke: null,
        strokeWidth: 0,
        strokeDashArray: null,
        strokeLineCap: "butt",
        strokeDashOffset: 0,
        strokeLineJoin: "miter",
        strokeUniform: false,
        strokeMiterLimit: 4,
        scaleX: YOUTUBE_THUMBNAIL_WIDTH / imageSize.width,
        scaleY: YOUTUBE_THUMBNAIL_HEIGHT / imageSize.height,
        angle: 0,
        flipX: false,
        flipY: false,
        opacity: 1,
        shadow: null,
        visible: true,
        backgroundColor: "",
        fillRule: "nonzero",
        paintFirst: "fill",
        globalCompositeOperation: "source-over",
        skewX: 0,
        skewY: 0,
        cropX: 0,
        cropY: 0,
        src: imageUrl,
        crossOrigin: "anonymous",
        filters: [],
        id: `ai-thumbnail-${Date.now()}`,
      },
    ],
    background: "#ffffff",
  });
}

function AiFeatures() {
  const router = useRouter();
  const { userDesigns, userSubscription } = useEditorStore();
  const [activeMode, setActiveMode] = useState(null);
  const [promptValue, setPromptValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const modeConfig = activeMode ? MODES[activeMode] : null;

  const openGenerator = (mode) => {
    setActiveMode(mode);
    setPromptValue("");
  };

  const closeGenerator = () => {
    if (isGenerating) return;
    setActiveMode(null);
    setPromptValue("");
  };

  const handleGenerateThumbnail = async () => {
    if (!modeConfig || !promptValue.trim() || isGenerating) return;

    if (userDesigns?.length >= 5 && !userSubscription?.isPremium) {
      toast.error("Please upgrade to premium!", {
        description: "You need to upgrade to premium to create more designs",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = modeConfig.getPrompt(promptValue.trim());
      const generatedImage = await generateImageFromAI(prompt, {
        aspectRatio: "16:9",
      });

      const imageUrl = generatedImage?.data?.url;

      if (!imageUrl) {
        throw new Error("AI did not return an image");
      }

      const newDesign = await saveDesign({
        name:
          activeMode === "title"
            ? `AI Thumbnail - ${promptValue.trim()}`
            : "AI Custom Thumbnail",
        canvasData: await buildThumbnailCanvasData(imageUrl),
        width: YOUTUBE_THUMBNAIL_WIDTH,
        height: YOUTUBE_THUMBNAIL_HEIGHT,
        category: "youtube_thumbnail",
      });

      if (!newDesign?.success) {
        throw new Error("Failed to create thumbnail design");
      }

      toast.success("Thumbnail created");
      router.push(`/editor/${newDesign.data._id}`);
    } catch (error) {
      toast.error(error.message || "Failed to generate thumbnail");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="ai-draft"
      className="scroll-mt-20 bg-[#272729] px-6 py-16 text-white md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[980px] text-center">
        <h2 className="apple-display flex items-center justify-center text-[34px] md:text-[40px]">
          <Sparkles className="mr-2 h-6 w-6 text-[#2997ff]" />
          Start with a draft
        </h2>
        <p className="mx-auto mt-3 max-w-[620px] text-[21px] font-normal leading-[1.19] text-[#cccccc]">
          Start from a title or prompt, then tune the image, text, and layout in
          the editor.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => openGenerator("title")}
            className="border-[#0066cc] bg-[#0066cc] text-[17px] text-white hover:bg-[#0066cc]/90"
          >
            Generate from title
          </Button>
          <Button
            variant="outline"
            onClick={() => openGenerator("custom")}
            className="border-[#2997ff] bg-transparent text-[17px] text-[#2997ff] hover:bg-white/5 hover:text-[#2997ff]"
          >
            Custom prompt
          </Button>
        </div>
      </div>
      <Dialog open={Boolean(activeMode)} onOpenChange={closeGenerator}>
        <DialogContent className="rounded-[18px] sm:max-w-[520px]">
          <DialogTitle className="flex items-center gap-2 text-[21px] font-semibold tracking-[-0.01em]">
            <Wand2 className="h-5 w-5 text-[#0066cc]" />
            {modeConfig?.title}
          </DialogTitle>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[14px] font-semibold text-[#333]">
                {modeConfig?.label}
              </span>
              {modeConfig?.multiline ? (
                <Textarea
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  placeholder={modeConfig.placeholder}
                  className="min-h-[140px] resize-none focus-visible:border-[#0071e3] focus-visible:ring-[#0071e3]/20"
                  disabled={isGenerating}
                />
              ) : (
                <Input
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  placeholder={modeConfig?.placeholder}
                  disabled={isGenerating}
                  className="focus-visible:border-[#0071e3] focus-visible:ring-[#0071e3]/20"
                />
              )}
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeGenerator}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateThumbnail}
                disabled={!promptValue.trim() || isGenerating}
                className="min-w-[150px] bg-[#0066cc] text-white hover:bg-[#0066cc]/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default AiFeatures;
