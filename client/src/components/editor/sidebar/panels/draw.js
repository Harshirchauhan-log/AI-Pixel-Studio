"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brushSizes, drawingPanelColorPresets } from "@/config";
import {
  toggleDrawingMode,
  toggleEraseMode,
  updateDrawingBrush,
} from "@/fabric/fabric-utils";
import { useEditorStore } from "@/store";
import {
  Droplets,
  EraserIcon,
  Minus,
  Paintbrush,
  Palette,
  PencilIcon,
  Plus,
} from "lucide-react";
import { useReducer } from "react";

const initialDrawingState = {
  isDrawingMode: false,
  isErasing: false,
  drawingColor: "#000000",
  brushWidth: 5,
  drawingOpacity: 100,
  activeTab: "colors",
};

function drawingReducer(state, action) {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.values };
    default:
      return state;
  }
}

function DrawingPanel() {
  const { canvas } = useEditorStore();
  const [drawingState, dispatchDrawing] = useReducer(
    drawingReducer,
    initialDrawingState
  );
  const {
    isDrawingMode,
    isErasing,
    drawingColor,
    brushWidth,
    drawingOpacity,
    activeTab,
  } = drawingState;

  const handleToggleDrawingMode = () => {
    if (!canvas) return;
    const newMode = !isDrawingMode;
    dispatchDrawing({
      type: "patch",
      values: {
        isDrawingMode: newMode,
        isErasing: newMode && isErasing ? false : isErasing,
      },
    });

    toggleDrawingMode(canvas, newMode, drawingColor, brushWidth);
  };

  const handleDrawingColorChange = (color) => {
    dispatchDrawing({ type: "patch", values: { drawingColor: color } });

    if (canvas && isDrawingMode && !isErasing) {
      updateDrawingBrush(canvas, { color });
    }
  };

  const handleBrushWidthChange = (width) => {
    dispatchDrawing({ type: "patch", values: { brushWidth: width } });
    if (canvas && isDrawingMode) {
      updateDrawingBrush(canvas, { width: isErasing ? width * 2 : width });
    }
  };

  const handleDrawingOpacityChange = (value) => {
    const opacity = Number(value[0]);
    dispatchDrawing({ type: "patch", values: { drawingOpacity: opacity } });
    if (canvas && isDrawingMode) {
      updateDrawingBrush(canvas, { opacity: opacity / 100 });
    }
  };

  const handleToggleErasing = () => {
    if (!canvas || !isDrawingMode) return;
    const newErasing = !isErasing;
    dispatchDrawing({ type: "patch", values: { isErasing: newErasing } });

    toggleEraseMode(canvas, newErasing, drawingColor, brushWidth * 2);
  };

  return (
    <div className="p-4">
      <div className="space-y-5">
        <Button
          variant={isDrawingMode ? "default" : "outline"}
          className={"group w-full transition-all"}
          size="lg"
          onClick={handleToggleDrawingMode}
        >
          <PencilIcon
            className="mr-2 h-5 w-5"
          />
          <span>
            {isDrawingMode ? "Exit Drawing Mode" : "Enter Drawing Mode"}
          </span>
        </Button>
        {isDrawingMode && (
          <>
            <Tabs
              defaultValue="colors"
              className={"w-full"}
              value={activeTab}
              onValueChange={(value) =>
                dispatchDrawing({ type: "patch", values: { activeTab: value } })
              }
            >
              <TabsList className={"mb-4 grid grid-cols-3"}>
                <TabsTrigger value="colors">
                  <Palette className="mr-2 h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="brush">
                  <Paintbrush className="mr-2 h-4 w-4" />
                  Brush
                </TabsTrigger>
                <TabsTrigger value="tools">
                  <EraserIcon className="mr-2 h-4 w-4" />
                  Tools
                </TabsTrigger>
              </TabsList>
              <TabsContent value="colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Color Palette</Label>
                    <div
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: drawingColor }}
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {drawingPanelColorPresets.map((color) => (
                      <div key={color}>
                        <button
                          type="button"
                          aria-label={`Use drawing color ${color}`}
                          aria-pressed={color === drawingColor}
                          className={`h-10 w-10 rounded-full border border-black/10 transition-transform hover:scale-105 ${
                              color === drawingColor
                                ? "ring-2 ring-[#0071e3] ring-offset-2"
                                : ""
                            }
                            `}
                          onClick={() => handleDrawingColorChange(color)}
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex space-x-2">
                    <div className="relative">
                      <Input
                        type="color"
                        aria-label="Drawing color picker"
                        value={drawingColor}
                        onChange={(e) =>
                          handleDrawingColorChange(e.target.value)
                        }
                        className={"h-11 w-12 cursor-pointer rounded-[8px] p-1"}
                        disabled={isErasing}
                      />
                    </div>
                    <Input
                      type="text"
                      aria-label="Drawing color hex value"
                      value={drawingColor}
                      onChange={(e) => handleDrawingColorChange(e.target.value)}
                      className={"flex-1"}
                      disabled={isErasing}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="brush" className={"space-y-4"}>
                <div className="space-y-3">
                  <Label className={"block text-sm font-semibold"}>
                    Brush Size
                  </Label>
                  <div className="flex items-center space-x-3">
                    <Minus className="h-4 w-4 text-[#6e6e73]" />
                    <Slider
                      value={[brushWidth]}
                      min={1}
                      max={30}
                      step={1}
                      onValueChange={(value) => handleBrushWidthChange(value[0])}
                      className="flex-1"
                    />
                    <Plus className="h-4 w-4 text-[#6e6e73]" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {brushSizes.map((size) => (
                      <Button
                        key={size.value}
                        variant={
                          size.value === brushWidth ? "default" : "outline"
                        }
                        className={"h-9 px-2 py-1 text-[12px]"}
                        onClick={() => handleBrushWidthChange(size.value)}
                      >
                        {size.label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <Label className={"flex items-center font-normal"}>
                        <Droplets className="mr-2 h-4 w-4" />
                        Opacity
                      </Label>
                      <span className="text-[12px] text-[#6e6e73]">
                        {drawingOpacity}%
                      </span>
                    </div>
                    <Slider
                      value={[drawingOpacity]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={(value) =>
                        handleDrawingOpacityChange(value)
                      }
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="tools">
                <Button
                  onClick={handleToggleErasing}
                  variant={isErasing ? "destructive" : "outline"}
                  className={"w-full"}
                  size="lg"
                >
                  <EraserIcon className="mr-2 w-5 h-5" />
                  {isErasing ? "Stop Erasing" : "Eraser mode"}
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

export default DrawingPanel;
