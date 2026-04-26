"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { fontFamilies } from "@/config";
import {
  cloneSelectedObject,
  deletedSelectedObject,
} from "@/fabric/fabric-utils";
import { useEditorStore } from "@/store";
import {
  ArrowRight,
  Bold,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Italic,
  MoveDown,
  MoveUp,
  Trash,
  Underline,
} from "lucide-react";
import { useEffect, useReducer, useRef } from "react";

const initialPropertiesState = {
  objectType: "",
  opacity: 100,
  width: 0,
  height: 0,
  text: "",
  fontSize: 24,
  fontFamily: "Arial",
  fontWeight: "normal",
  fontStyle: "normal",
  underline: false,
  textColor: "#000000",
  textBackgroundColor: "",
  letterSpacing: 0,
  fillColor: "#ffffff",
  borderColor: "#000000",
  borderWidth: 0,
  borderStyle: "solid",
  filter: "none",
  blur: 0,
};

function getBorderStyle(strokeDashArray) {
  if (!strokeDashArray) return "solid";
  if (strokeDashArray[0] === 5 && strokeDashArray[1] === 5) return "dashed";
  if (strokeDashArray[0] === 2 && strokeDashArray[1] === 2) return "dotted";
  return "solid";
}

function getImageFilterState(activeObject) {
  const filterObj = activeObject.filters?.[0];
  if (!filterObj) return { filter: "none", blur: 0 };
  if (filterObj.type === "Grayscale") return { filter: "grayscale", blur: 0 };
  if (filterObj.type === "Sepia") return { filter: "sepia", blur: 0 };
  if (filterObj.type === "Invert") return { filter: "invert", blur: 0 };
  if (filterObj.type === "Blur") {
    return { filter: "blur", blur: filterObj.blur * 100 || 0 };
  }
  return { filter: "none", blur: 0 };
}

function getPropertiesFromObject(activeObject) {
  const nextState = {
    ...initialPropertiesState,
    opacity: Math.round(activeObject.opacity * 100) || 100,
    width: Math.round(activeObject.width * activeObject.scaleX),
    height: Math.round(activeObject.height * activeObject.scaleY),
    borderColor: activeObject.stroke || "#000000",
    borderWidth: activeObject.strokeWidth || 0,
    borderStyle: getBorderStyle(activeObject.strokeDashArray),
  };

  if (activeObject.type === "i-text") {
    return {
      ...nextState,
      objectType: "text",
      text: activeObject.text || "",
      fontSize: activeObject.fontSize || 24,
      fontFamily: activeObject.fontFamily || "Arial",
      fontWeight: activeObject.fontWeight || "normal",
      fontStyle: activeObject.fontStyle || "normal",
      underline: activeObject.underline || false,
      textColor: activeObject.fill || "#000000",
      textBackgroundColor: activeObject.backgroundColor || "",
      letterSpacing: activeObject.charSpacing || 0,
    };
  }

  if (activeObject.type === "image") {
    return {
      ...nextState,
      objectType: "image",
      ...getImageFilterState(activeObject),
    };
  }

  if (activeObject.type === "path") {
    return { ...nextState, objectType: "path" };
  }

  return {
    ...nextState,
    objectType: "shape",
    fillColor:
      activeObject.fill && typeof activeObject.fill === "string"
        ? activeObject.fill
        : nextState.fillColor,
  };
}

function propertiesReducer(state, action) {
  switch (action.type) {
    case "sync":
      return action.values;
    case "patch":
      return { ...state, ...action.values };
    case "reset":
      return initialPropertiesState;
    default:
      return state;
  }
}

function usePropertiesPanel() {
  const { canvas, markAsModified } = useEditorStore();
  //active object
  const selectedObjectRef = useRef(null);
  const [properties, dispatchProperties] = useReducer(
    propertiesReducer,
    initialPropertiesState
  );
  const {
    objectType,
    opacity,
    width,
    height,
    text,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    textColor,
    textBackgroundColor,
    letterSpacing,
    fillColor,
    borderColor,
    borderWidth,
    borderStyle,
    filter,
    blur,
  } = properties;

  useEffect(() => {
    if (!canvas) return;
    const handleSelectionCreated = () => {
      const activeObject = canvas.getActiveObject();

      if (activeObject) {
        selectedObjectRef.current = activeObject;
        dispatchProperties({
          type: "sync",
          values: getPropertiesFromObject(activeObject),
        });
      }
    };

    const handleSelectionCleared = () => {
      selectedObjectRef.current = null;
      dispatchProperties({ type: "reset" });
    };

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      handleSelectionCreated();
    }

    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionCreated);
    canvas.on("object:modified", handleSelectionCreated);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionCreated);
      canvas.off("object:modified", handleSelectionCreated);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [canvas]);

  const updateObjectProperty = (property, value) => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;

    selectedObject.set(property, value);
    canvas.renderAll();
    markAsModified();
  };

  //opacity
  const handleOpacityChange = (value) => {
    const newValue = Number(value[0]);
    dispatchProperties({ type: "patch", values: { opacity: newValue } });
    updateObjectProperty("opacity", newValue / 100);
  };

  //duplicate
  const handleDuplicate = async () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    await cloneSelectedObject(canvas);
    markAsModified();
  };

  //delete
  const handleDelete = () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    deletedSelectedObject(canvas);
    markAsModified();
  };

  //arrangements
  const handleBringToFront = () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    canvas.bringObjectToFront(selectedObject);
    canvas.renderAll();
    markAsModified();
  };

  const handleSendToBack = () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    canvas.sendObjectToBack(selectedObject);
    canvas.renderAll();
    markAsModified();
  };

  //Flip H and Flip V

  const handleFlipHorizontal = () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    const flipX = !selectedObject.flipX;
    updateObjectProperty("flipX", flipX);
  };

  const handleFlipVertical = () => {
    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject) return;
    const flipY = !selectedObject.flipY;
    updateObjectProperty("flipY", flipY);
  };

  const handleTextChange = (event) => {
    const newText = event.target.value;
    dispatchProperties({ type: "patch", values: { text: newText } });
    updateObjectProperty("text", newText);
  };

  const handleFontSizeChange = (e) => {
    const newSize = Number(e.target.value);
    dispatchProperties({ type: "patch", values: { fontSize: newSize } });
    updateObjectProperty("fontSize", newSize);
  };

  const handleFontFamilyChange = (value) => {
    dispatchProperties({ type: "patch", values: { fontFamily: value } });
    updateObjectProperty("fontFamily", value);
  };

  const handleToggleBold = () => {
    const newWeight = fontWeight === "bold" ? "normal" : "bold";
    dispatchProperties({ type: "patch", values: { fontWeight: newWeight } });
    updateObjectProperty("fontWeight", newWeight);
  };

  const handleToggleItalic = () => {
    const newStyle = fontStyle === "italic" ? "normal" : "italic";
    dispatchProperties({ type: "patch", values: { fontStyle: newStyle } });
    updateObjectProperty("fontStyle", newStyle);
  };

  const handleToggleUnderline = () => {
    const newUnderline = !underline;
    dispatchProperties({ type: "patch", values: { underline: newUnderline } });
    updateObjectProperty("underline", newUnderline);
  };

  const handleToggleTextColorChange = (e) => {
    const newTextColor = e.target.value;
    dispatchProperties({ type: "patch", values: { textColor: newTextColor } });
    updateObjectProperty("fill", newTextColor);
  };

  const handleToggleTextBackgroundColorChange = (e) => {
    const newTextBgColor = e.target.value;
    dispatchProperties({
      type: "patch",
      values: { textBackgroundColor: newTextBgColor },
    });
    updateObjectProperty("backgroundColor", newTextBgColor);
  };

  const handleLetterSpacingChange = (value) => {
    const newSpacing = value[0];
    dispatchProperties({ type: "patch", values: { letterSpacing: newSpacing } });
    updateObjectProperty("charSpacing", newSpacing);
  };

  const handleFillColorChange = (event) => {
    const newFillColor = event.target.value;
    dispatchProperties({ type: "patch", values: { fillColor: newFillColor } });
    updateObjectProperty("fill", newFillColor);
  };

  const handleBorderColorChange = (event) => {
    const newBorderColor = event.target.value;
    dispatchProperties({
      type: "patch",
      values: { borderColor: newBorderColor },
    });
    updateObjectProperty("stroke", newBorderColor);
  };

  const handleBorderWidthChange = (value) => {
    const newBorderWidth = value[0];
    dispatchProperties({
      type: "patch",
      values: { borderWidth: newBorderWidth },
    });
    updateObjectProperty("strokeWidth", newBorderWidth);
  };

  const handleBorderStyleChange = (value) => {
    dispatchProperties({ type: "patch", values: { borderStyle: value } });

    let strokeDashArray = null;

    if (value === "dashed") {
      strokeDashArray = [5, 5];
    } else if (value === "dotted") {
      strokeDashArray = [2, 2];
    }

    updateObjectProperty("strokeDashArray", strokeDashArray);
  };

  const handleImageFilterChange = async (value) => {
    dispatchProperties({ type: "patch", values: { filter: value } });

    const selectedObject = selectedObjectRef.current;
    if (!canvas || !selectedObject || selectedObject.type !== "image") return;
    try {
      canvas.discardActiveObject();

      const { filters } = await import("fabric");

      selectedObject.filters = [];

      switch (value) {
        case "grayscale":
          selectedObject.filters.push(new filters.Grayscale());

          break;
        case "sepia":
          selectedObject.filters.push(new filters.Sepia());

          break;
        case "invert":
          selectedObject.filters.push(new filters.Invert());

          break;
        case "blur":
          selectedObject.filters.push(new filters.Blur({ blur: blur / 100 }));

          break;
        case "none":
        default:
          break;
      }

      selectedObject.applyFilters();

      canvas.setActiveObject(selectedObject);
      canvas.renderAll();
      markAsModified();
    } catch (e) {
      console.error("Failed to apply filters");
    }
  };

  const handleBlurChange = async (value) => {
    const newBlurValue = value[0];
    dispatchProperties({ type: "patch", values: { blur: newBlurValue } });

    const selectedObject = selectedObjectRef.current;
    if (
      !canvas ||
      !selectedObject ||
      selectedObject.type !== "image" ||
      filter !== "blur"
    )
      return;

    try {
      const { filters } = await import("fabric");

      selectedObject.filters = [new filters.Blur({ blur: newBlurValue / 100 })];
      selectedObject.applyFilters();
      canvas.renderAll();
      markAsModified();
    } catch (error) {
      console.error("Error while applying blur !", e);
    }
  };

  const handleClosePanel = () => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  return (
    <aside
      aria-label="Object properties"
      className="flex h-full w-[280px] shrink-0 flex-col border-l border-black/10 bg-white"
    >
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            Properties
          </span>
        </div>
        <button
          type="button"
          className="back-button ml-auto mr-0"
          onClick={handleClosePanel}
          aria-label="Close properties panel"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
        <h3 className="text-[14px] font-semibold text-[#333]">Size & Position</h3>
        {/* Width & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className={"text-[12px] text-[#6e6e73]"}>Width</Label>
            <div className="flex h-9 items-center rounded-[8px] border border-black/10 px-3 py-2 text-[14px]">
              {width}
            </div>
          </div>
          <div className="space-y-1">
            <Label className={"text-[12px] text-[#6e6e73]"}>Height</Label>
            <div className="flex h-9 items-center rounded-[8px] border border-black/10 px-3 py-2 text-[14px]">
              {height}
            </div>
          </div>
        </div>
        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="opacity" className={"text-[12px] text-[#6e6e73]"}>
              Opacity
            </Label>
            <span className="text-[12px] text-[#6e6e73]">{opacity}%</span>
          </div>
          <Slider
            id="opacity"
            min={0}
            max={100}
            step={1}
            value={[opacity]}
            onValueChange={(value) => handleOpacityChange(value)}
          />
        </div>
        {/* Flip H, Flip V */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleFlipHorizontal}
            variant={"outline"}
            size="sm"
            className={"h-9 text-[12px]"}
          >
            <FlipHorizontal className="h-4 w-4 mr-1" />
            Flip H
          </Button>
          <Button
            variant={"outline"}
            onClick={handleFlipVertical}
            size="sm"
            className={"h-9 text-[12px]"}
          >
            <FlipVertical className="h-4 w-4 mr-1" />
            Flip V
          </Button>
        </div>

        {/* Arrangement */}
        <div className="space-y-4 border-t border-black/10 pt-4">
          <h3 className="text-[14px] font-semibold text-[#333]">Layer Position</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleBringToFront}
              variant={"outline"}
              size="sm"
              className={"h-9 text-[12px]"}
            >
              <MoveUp className="h-4 w-4" />
              <span>Bring to front</span>
            </Button>
            <Button
              onClick={handleSendToBack}
              variant={"outline"}
              size="sm"
              className={"h-9 text-[12px]"}
            >
              <MoveDown className="h-4 w-4" />
              <span>Send to back</span>
            </Button>
          </div>
        </div>

        {/* Duplicate and delete */}
        <div className="space-y-4 border-t border-black/10 pt-4">
          <h3 className="text-[14px] font-semibold text-[#333]">Object actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDuplicate}
              variant={"default"}
              size="sm"
              className={"h-9 text-[12px]"}
            >
              <Copy className="h-4 w-4" />
              <span>Duplicate</span>
            </Button>
            <Button
              onClick={handleDelete}
              variant={"destructive"}
              size="sm"
              className={"h-9 text-[12px]"}
            >
              <Trash className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        {/* Text related properties */}
        {objectType === "text" && (
          <div className="space-y-4 border-t border-black/10 pt-4">
            <h3 className="text-[14px] font-semibold text-[#333]">Text</h3>
            <div className="space-y-2">
              <Label className={"text-xs"} htmlFor="text-content">
                Text Content
              </Label>
              <Textarea
                id="text-content"
                value={text}
                onChange={handleTextChange}
                className={"h-20 resize-none"}
              />
            </div>
            <div className="space-y-2">
              <Label className={"text-xs"} htmlFor="font-size">
                Font Size
              </Label>
              <Input
                id="font-size"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e)}
                className={"w-16 h-7 text-xs"}
                type={"number"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="font-family" className="text-sm">
                Font family
              </Label>
              <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
                <SelectTrigger id="font-family" className={"h-10"}>
                  <SelectValue placeholder="Select Font" />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((fontItem) => (
                    <SelectItem
                      key={fontItem}
                      value={fontItem}
                      style={{ fontFamily: fontItem }}
                    >
                      {fontItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Style</Label>
              <div className="flex gap-2">
                <Button
                  variant={fontWeight === "bold" ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleBold}
                  className={"w-8 h-8"}
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  variant={fontStyle === "italic" ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleItalic}
                  className={"w-8 h-8"}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  variant={underline ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleUnderline}
                  className={"w-8 h-8"}
                >
                  <Underline className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="space-y-2">
                <Label htmlFor="text-color" className="text-sm">
                  Text Color
                </Label>
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: textColor }}
                  />
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={handleToggleTextColorChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-bg-color" className="text-sm">
                  Text BG Color
                </Label>
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: textBackgroundColor }}
                  />
                  <Input
                    id="text-bg-color"
                    type="color"
                    value={textBackgroundColor}
                    onChange={handleToggleTextBackgroundColorChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className={"text-xs"} htmlFor="letter-spacing">
                  Letter Spacing
                </Label>
                <span className="text-xs">{letterSpacing}</span>
              </div>
              <Slider
                id="letter-spacing"
                min={-200}
                max={800}
                step={10}
                value={[letterSpacing]}
                onValueChange={(value) => handleLetterSpacingChange(value)}
              />
            </div>
          </div>
        )}

        {objectType === "shape" && (
          <div className="space-y-4 p-4 border-t">
            <h3 className="text-sm font-medium">Shape Properties</h3>
            <div className="flex justify-between">
              <div className="space-y-2">
                <Label htmlFor="fill-color" className="text-xs">
                  Fill Color
                </Label>
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: fillColor }}
                  />
                  <Input
                    id="fill-color"
                    type="color"
                    value={fillColor}
                    onChange={handleFillColorChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="border-color" className="text-xs">
                  Border Color
                </Label>
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: borderColor }}
                  />
                  <Input
                    id="fill-color"
                    type="color"
                    value={borderColor}
                    onChange={handleBorderColorChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-width" className={"text-xs"}>
                Border Width
              </Label>
              <span className={"text-xs mb-2"}>{borderWidth}%</span>
              <Slider
                id="border-width"
                min={0}
                max={20}
                step={1}
                value={[borderWidth]}
                onValueChange={(value) => handleBorderWidthChange(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-style" className={"text-xs"}>
                Border Style
              </Label>
              <Select
                value={borderStyle}
                onValueChange={handleBorderStyleChange}
              >
                <SelectTrigger id="border-style" className={"h-10"}>
                  <SelectValue placeholder="Select Border Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {objectType === "image" && (
          <div className="space-y-4 p-4 border-t">
            <h3 className="text-sm font-medium">Image Properties</h3>
            <div className="space-y-2">
              <Label htmlFor="border-color" className="text-xs">
                Border Color
              </Label>
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: borderColor }}
                />
                <Input
                  id="fill-color"
                  type="color"
                  value={borderColor}
                  onChange={handleBorderColorChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-width" className={"text-xs"}>
                Border Width
              </Label>
              <span className={"text-xs mb-2"}>{borderWidth}%</span>
              <Slider
                id="border-width"
                min={0}
                max={20}
                step={1}
                value={[borderWidth]}
                onValueChange={(value) => handleBorderWidthChange(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-style" className={"text-xs"}>
                Border Style
              </Label>
              <Select
                value={borderStyle}
                onValueChange={handleBorderStyleChange}
              >
                <SelectTrigger id="border-style" className={"h-10"}>
                  <SelectValue placeholder="Select Border Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter" className={"text-xs"}>
                Filter
              </Label>
              <Select value={filter} onValueChange={handleImageFilterChange}>
                <SelectTrigger id="filter" className={"h-10"}>
                  <SelectValue placeholder="Select Image Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="grayscale">Grayscale</SelectItem>
                  <SelectItem value="sepia">Sepia</SelectItem>
                  <SelectItem value="invert">Invert</SelectItem>
                  <SelectItem value="blur">Blur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filter === "blur" && (
              <div className="space-y-2">
                <div className="flex justify-between mb-4">
                  <Label htmlFor="blur" className="text-xs">
                    Blur Amount
                  </Label>
                  <span className="font-medium text-xs">{blur}%</span>
                </div>
                <Slider
                  id="blur"
                  min={0}
                  max={100}
                  step={1}
                  value={[blur]}
                  onValueChange={(value) => handleBlurChange(value)}
                />
              </div>
            )}
          </div>
        )}

        {objectType === "path" && (
          <div className="space-y-4 p-4 border-t">
            <h3 className="text-sm font-medium">Path Properties</h3>
            <div className="space-y-2">
              <Label htmlFor="border-color" className="text-xs">
                Border Color
              </Label>
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black/10">
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: borderColor }}
                />
                <Input
                  id="fill-color"
                  type="color"
                  value={borderColor}
                  onChange={handleBorderColorChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-width" className={"text-xs"}>
                Border Width
              </Label>
              <span className={"text-xs mb-2"}>{borderWidth}%</span>
              <Slider
                id="border-width"
                min={0}
                max={20}
                step={1}
                value={[borderWidth]}
                onValueChange={(value) => handleBorderWidthChange(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="border-style" className={"text-xs"}>
                Border Style
              </Label>
              <Select
                value={borderStyle}
                onValueChange={handleBorderStyleChange}
              >
                <SelectTrigger id="border-style" className={"h-10"}>
                  <SelectValue placeholder="Select Border Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Properties() {
  return usePropertiesPanel();
}

export default Properties;
