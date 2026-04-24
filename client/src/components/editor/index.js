"use client";

import { useParams } from "next/navigation";
import Canvas from "./canvas";
import Header from "./header";
import Sidebar from "./sidebar";
import { useCallback, useEffect, useRef } from "react";
import { centerCanvas } from "@/fabric/fabric-utils";
import { useEditorStore } from "@/store";
import { getUserDesignByID } from "@/services/design-service";
import Properties from "./properties";
import SubscriptionModal from "../subscription/premium-modal";

function MainEditor() {
  const params = useParams();
  const designId = params?.slug;

  const isLoadingRef = useRef(!!designId);
  const loadAttemptedRef = useRef(false);
  const errorRef = useRef(null);

  const {
    canvas,
    setDesignId,
    resetStore,
    setName,
    setShowProperties,
    showProperties,
    isEditing,
    setShowPremiumModal,
    showPremiumModal,
    setIsHydratingDesign,
  } = useEditorStore();

  useEffect(() => {
    resetStore();
    loadAttemptedRef.current = false;
    errorRef.current = null;
    isLoadingRef.current = !!designId;

    if (designId) setDesignId(designId);

    return () => {
      resetStore();
    };
  }, [designId, resetStore, setDesignId]);

  useEffect(() => {
    if (isLoadingRef.current && !canvas && designId) {
      const timer = setTimeout(() => {
        if (isLoadingRef.current) {
          isLoadingRef.current = false;
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [canvas, designId]);

  const loadDesign = useCallback(async () => {
    if (!canvas || !designId || loadAttemptedRef.current) return;
    try {
      isLoadingRef.current = true;
      setIsHydratingDesign(true);
      loadAttemptedRef.current = true;

      const response = await getUserDesignByID(designId);
      const design = response.data;

      if (design) {
        //update name
        setName(design.name);

        //set the design ID just incase after getting the data
        setDesignId(designId);

        try {
          if (design.canvasData) {
            canvas.clear();
            if (design.width && design.height) {
              canvas.setDimensions({
                width: design.width,
                height: design.height,
              });
              centerCanvas(canvas);
            }

            const canvasData =
              typeof design.canvasData === "string"
                ? JSON.parse(design.canvasData)
                : design.canvasData;

            const hasObjects =
              canvasData.objects && canvasData.objects.length > 0;

            if (canvasData.background) {
              canvas.backgroundColor = canvasData.background;
            } else {
              canvas.backgroundColor = "#ffffff";
            }

            if (!hasObjects) {
              canvas.renderAll();
              return true;
            }

            const loadedCanvas = await canvas.loadFromJSON(canvasData);
            loadedCanvas.requestRenderAll();
          } else {
            console.log("no canvas data");
            canvas.clear();
            canvas.setWidth(design.width);
            canvas.setHeight(design.height);
            centerCanvas(canvas);
            canvas.backgroundColor = "#ffffff";
            canvas.renderAll();
          }
        } catch (e) {
          console.error(("Error loading canvas", e));
          errorRef.current = "Error loading canvas";
        } finally {
          isLoadingRef.current = false;
          setIsHydratingDesign(false);
        }
      } else {
        isLoadingRef.current = false;
        setIsHydratingDesign(false);
      }
    } catch (e) {
      console.error("Failed to load design", e);
      errorRef.current = "failed to load design";
      isLoadingRef.current = false;
      setIsHydratingDesign(false);
    }
  }, [canvas, designId, setDesignId, setIsHydratingDesign, setName]);

  useEffect(() => {
    if (designId && canvas && !loadAttemptedRef.current) {
      loadDesign();
    }
  }, [canvas, designId, loadDesign]);

  useEffect(() => {
    if (!canvas) return;

    const handleSelectionCreated = () => {
      const activeObject = canvas.getActiveObject();

      if (activeObject) {
        setShowProperties(true);
      }
    };

    const handleSelectionCleared = () => {
      setShowProperties(false);
    };

    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionCreated);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionCreated);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [canvas, setShowProperties]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f5f7] text-[#1d1d1f]">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isEditing && <Sidebar />}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <main className="flex min-h-0 flex-1 items-stretch justify-stretch overflow-hidden bg-[#f5f5f7]">
            <Canvas />
          </main>
          {showProperties && isEditing && <Properties />}
        </div>
      </div>
      <SubscriptionModal
        isOpen={showPremiumModal}
        onClose={setShowPremiumModal}
      />
    </div>
  );
}

export default MainEditor;
