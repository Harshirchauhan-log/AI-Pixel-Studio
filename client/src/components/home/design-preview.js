"use client";

import { useEffect, useState } from "react";

function DesignPreview({ design }) {
  const [canvasId] = useState(`canvas-${design._id}-${Date.now()}`);

  useEffect(() => {
    const canvasElement = document.getElementById(canvasId);
    let designPreviewCanvas = null;
    let didCancel = false;
    let didStartPreview = false;
    let timer = null;

    if (!canvasElement) return;

    const renderPreview = () => {
      if (didStartPreview) return;
      didStartPreview = true;

      timer = setTimeout(async () => {
        try {
          const fabric = await import("fabric");
          const canvasElement = document.getElementById(canvasId);

          if (!canvasElement || didCancel) return;

          designPreviewCanvas = new fabric.StaticCanvas(canvasId, {
            width: 300,
            height: 300,
            renderOnAddRemove: true,
          });

          let canvasData;

          try {
            canvasData =
              typeof design.canvasData === "string"
                ? JSON.parse(design.canvasData)
                : design.canvasData;
          } catch (innerErr) {
            return;
          }

          if (
            canvasData === undefined ||
            canvasData === null ||
            canvasData?.objects?.length === 0
          ) {
            designPreviewCanvas.backgroundColor = "#f5f5f7";
            designPreviewCanvas.requestRenderAll();
            return;
          }

          if (canvasData.background) {
            designPreviewCanvas.backgroundColor = canvasData.background;
            designPreviewCanvas.requestRenderAll();
          }

          designPreviewCanvas.loadFromJSON(canvasData, () => {
            designPreviewCanvas.requestRenderAll();
          });
        } catch (e) {}
      }, 100);
    };

    if (!("IntersectionObserver" in window)) {
      renderPreview();
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            renderPreview();
            observer.disconnect();
          }
        },
        { rootMargin: "160px" }
      );

      observer.observe(canvasElement);

      return () => {
        didCancel = true;
        if (timer) clearTimeout(timer);
        observer.disconnect();
        if (designPreviewCanvas && typeof designPreviewCanvas.dispose === "function") {
          try {
            designPreviewCanvas.dispose();
          } catch (e) {}
        }
        designPreviewCanvas = null;
      };
    }

    return () => {
      didCancel = true;
      if (timer) clearTimeout(timer);
      if (designPreviewCanvas && typeof designPreviewCanvas.dispose === "function") {
        try {
          designPreviewCanvas.dispose();
        } catch (e) {}
      }
      designPreviewCanvas = null;
    };
  }, [design?._id, design?.canvasData, canvasId]);

  return (
    <canvas
      id={canvasId}
      width="300"
      height="300"
      className="h-full w-full object-contain"
    />
  );
}

export default DesignPreview;
