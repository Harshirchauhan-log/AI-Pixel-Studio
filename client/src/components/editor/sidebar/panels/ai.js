"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addImageToCanvas } from "@/fabric/fabric-utils";
import { generateImageFromAI } from "@/services/upload-service";
import { useEditorStore } from "@/store";
import { Loader, Sparkles, Wand2 } from "lucide-react";
import Image from "next/image";
import { useReducer, useState } from "react";

const initialAiState = {
  isLoading: false,
  generatedContent: null,
  isUploading: false,
  uploadSuccess: false,
};

function aiReducer(state, action) {
  switch (action.type) {
    case "generate:start":
      return {
        ...state,
        isLoading: true,
        generatedContent: null,
        uploadSuccess: false,
      };
    case "generate:success":
      return {
        ...state,
        isLoading: false,
        generatedContent: action.url,
      };
    case "generate:finish":
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

function AiPanel() {
  const { canvas } = useEditorStore();
  const [prompt, setPrompt] = useState("");
  const [aiState, dispatchAi] = useReducer(aiReducer, initialAiState);
  const { isLoading, generatedContent, isUploading, uploadSuccess } = aiState;

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleGenerate = async () => {
    dispatchAi({ type: "generate:start" });

    try {
      await generateImage(prompt);
    } catch (e) {
      console.error(e);
    } finally {
      dispatchAi({ type: "generate:finish" });
    }
  };

  const generateImage = async (prompt) => {
    try {
      const response = await generateImageFromAI(prompt);
      if (response && response?.data?.url) {
        dispatchAi({ type: "generate:success", url: response?.data?.url });
      }
      console.log(response);
    } catch (e) {
      console.error("Error generating image from AI");
      throw e;
    }
  };

  const handleAiImageToCanvas = async () => {
    if (!canvas && !generatedContent) return;

    addImageToCanvas(canvas, generatedContent);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="mb-2 flex items-center space-x-2">
          <Wand2 className="h-5 w-5 text-[#0066cc]" />
          <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
            AI image generator
          </h3>
        </div>
        <div className="space-y-2">
          <Textarea
            aria-label="AI image prompt"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe the image you want to create."
            className={"min-h-[200px] resize-none focus-visible:border-[#0071e3] focus-visible:ring-[#0071e3]/20"}
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className={"w-full bg-[#0066cc] text-white hover:bg-[#0066cc]/90"}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="mx-4 flex flex-col items-center justify-center rounded-[18px] border border-black/10 bg-[#f5f5f7] p-6">
          <Loader className="mb-3 h-8 w-8 animate-spin text-[#0066cc]" />
          <p className="text-center text-[14px] text-[#6e6e73]">
            Creating your image...
          </p>
        </div>
      )}

      {generatedContent && !isLoading && (
        <div className="space-y-3 px-4 pb-4">
          <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[#f5f5f7]">
            <div className="relative aspect-square">
              <Image
                src={generatedContent}
                alt={`Generated image for prompt: ${prompt}`}
                fill
                unoptimized
                sizes="320px"
                className="object-contain"
              />
            </div>
          </div>
          <div>
            <Button
              onClick={handleAiImageToCanvas}
              className={"w-full bg-[#0066cc] text-white hover:bg-[#0066cc]/90"}
              variant={uploadSuccess ? "outline" : "default"}
              disabled={isUploading}
            >
              Add To Canvas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiPanel;
