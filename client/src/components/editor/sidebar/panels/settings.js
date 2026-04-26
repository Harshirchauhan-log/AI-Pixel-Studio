"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { colorPresets } from "@/config";
import { centerCanvas } from "@/fabric/fabric-utils";
import { useEditorStore } from "@/store";
import { Check, Palette } from "lucide-react";
import { useState } from "react";

function SettingsPanel() {
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const { canvas, markAsModified } = useEditorStore();

  const handleColorChange = (event) => {
    setBackgroundColor(event.target.value);
  };

  const handleColorPresetApply = (getCurrentColor) => {
    setBackgroundColor(getCurrentColor);
  };

  const handleApplyChanges = () => {
    if (!canvas) return;
    canvas.set("backgroundColor", backgroundColor);
    canvas.renderAll();

    centerCanvas(canvas);
    markAsModified();
  };

  return (
    <div className="space-y-6 p-4">
      <div className="mb-4 flex items-center space-x-2">
        <Palette className="h-5 w-5 text-[#0066cc]" />
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
          Background color
        </h3>
      </div>
      <div className="space-y-2">
        <div className="mb-3 grid grid-cols-6 gap-2">
          {colorPresets.map((color) => (
            <TooltipProvider key={color}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Use background color ${color}`}
                    aria-pressed={color === backgroundColor}
                    className={`h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-105 ${
                      color === backgroundColor
                        ? "ring-2 ring-[#0071e3] ring-offset-2"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorPresetApply(color)}
                  >
                    {color === backgroundColor && (
                      <Check className="mx-auto h-4 w-4 text-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{color}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <div className="mt-3 flex space-x-2">
          <div className="flex w-full gap-2">
            <Input
              type="color"
              aria-label="Background color picker"
              value={backgroundColor}
              onChange={handleColorChange}
              className={"h-11 w-12 cursor-pointer rounded-[8px] p-1"}
            />
            <Input
              type={"text"}
              aria-label="Background color hex value"
              value={backgroundColor}
              onChange={handleColorChange}
              className="flex-1 focus-visible:border-[#0071e3] focus-visible:ring-[#0071e3]/20"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
        <Separator className="my-4" />
        <Button className="w-full bg-[#0066cc] text-white hover:bg-[#0066cc]/90" onClick={handleApplyChanges}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}

export default SettingsPanel;
