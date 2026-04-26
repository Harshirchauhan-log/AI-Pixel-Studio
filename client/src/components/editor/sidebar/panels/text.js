"use client";

import { Button } from "@/components/ui/button";
import { textPresets } from "@/config";
import { addTextToCanvas } from "@/fabric/fabric-utils";
import { useEditorStore } from "@/store";
import { Type } from "lucide-react";

function TextPanel() {
  const { canvas } = useEditorStore();

  const handleAddCustomTextBox = () => {
    if (!canvas) return;

    addTextToCanvas(canvas, "Enter text here", { fontSize: 24 });
  };

  const handleAddPresetText = (currentPreset) => {
    if (!canvas) return;
    addTextToCanvas(canvas, currentPreset.text, currentPreset);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <Button
          onClick={handleAddCustomTextBox}
          className="flex w-full items-center justify-center bg-[#0066cc] text-white transition-colors hover:bg-[#0066cc]/90"
        >
          <Type className="mr-2 h-5 w-5" />
          <span>Add a text box</span>
        </Button>
        <div className="pt-2">
          <h4 className="mb-4 text-[14px] font-semibold text-[#333]">
            Default text styles
          </h4>
          <div className="space-y-4">
            {textPresets.map((preset) => (
              <button
                type="button"
                className="w-full rounded-[18px] border border-black/10 bg-white p-3 text-left transition-colors hover:bg-[#f5f5f7]"
                key={preset.text}
                onClick={() => handleAddPresetText(preset)}
                style={{
                  fontSize: `${Math.min(preset.fontSize / 1.8, 24)}px`,
                  fontWeight: preset.fontWeight,
                  fontStyle: preset.fontStyle || "normal",
                  fontFamily: preset.fontFamily,
                }}
              >
                {preset.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextPanel;
