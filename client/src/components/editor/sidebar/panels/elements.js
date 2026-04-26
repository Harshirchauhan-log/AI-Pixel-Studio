"use client";

import { addShapeToCanvas } from "@/fabric/fabric-utils";
import {
  shapeDefinitions,
  shapeTypes,
} from "@/fabric/shapes/shape-definitions";
import { useEditorStore } from "@/store";
import { useEffect, useRef } from "react";

function ElementsPanel() {
  const { canvas } = useEditorStore();
  const canvasElementRef = useRef({});

  useEffect(() => {
    const miniCanvases = {};

    const timer = setTimeout(async () => {
      try {
        const fabric = await import("fabric");

        for (const shapeType of shapeTypes) {
          const canvasElement = canvasElementRef.current[shapeType];
          if (!canvasElement) continue;
          const canvasId = `mini-canvas-${shapeType}-${Date.now()}`;
          canvasElement.id = canvasId;

          try {
            const definition = shapeDefinitions[shapeType];

            const miniCanvas = new fabric.StaticCanvas(canvasId, {
              width: 100,
              height: 100,
              backgroundColor: "transparent",
              renderOnAddRemove: true,
            });

            miniCanvases[shapeType] = miniCanvas;
            definition.thumbnail(fabric, miniCanvas);
            miniCanvas.renderAll();
          } catch (definitionErr) {
            console.error("Error while creating definition", definitionErr);
          }
        }
      } catch (e) {
        console.error("failed to init", e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      Object.values(miniCanvases).forEach((miniCanvas) => {
        if (miniCanvas && typeof miniCanvas.dispose === "function") {
          try {
            miniCanvas.dispose();
          } catch (e) {
            console.error("Error disposing canvas", e);
          }
        }
      });
    };
  }, []);

  const setCanvasRef = (getCurrentElement, shapeType) => {
    if (getCurrentElement) {
      canvasElementRef.current[shapeType] = getCurrentElement;
    }
  };

  const handleShapeClick = (type) => {
    addShapeToCanvas(canvas, type);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {shapeTypes.map((shapeType) => (
            <button
              type="button"
              className="flex h-[92px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-black/10 bg-[#f5f5f7] transition-colors hover:border-black/20 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
              key={shapeType}
              onClick={() => handleShapeClick(shapeType)}
              aria-label={`Add ${shapeType} shape`}
            >
              <canvas
                width="100"
                height="100"
                ref={(el) => setCanvasRef(el, shapeType)}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ElementsPanel;
