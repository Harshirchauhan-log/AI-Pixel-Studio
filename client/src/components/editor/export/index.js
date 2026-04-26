"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  exportAsJson,
  exportAsPDF,
  exportAsPng,
  exportAsSVG,
} from "@/services/export-service";
import { useEditorStore } from "@/store";
import {
  Download,
  File,
  FileIcon,
  FileImage,
  FileJson,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const exportFormats = [
  {
    id: "png",
    name: "PNG Image",
    icon: FileImage,
    description: "Best for web and social media",
  },
  {
    id: "svg",
    name: "SVG Vector",
    icon: FileIcon,
    description: "Scalable vector format",
  },
  {
    id: "pdf",
    name: "PDF Document",
    icon: File,
    description: "Best for printing",
  },
  {
    id: "json",
    name: "JSON Template",
    icon: FileJson,
    description: "Editable template format",
  },
];

function ExportModal({ isOpen, onClose }) {
  const { canvas } = useEditorStore();

  const [selectedFormat, setSelectedFormat] = useState("png");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!canvas) return;
    setIsExporting(true);

    try {
      let successFlag = false;

      switch (selectedFormat) {
        case "json":
          successFlag = exportAsJson(canvas, "JSON FileName");

          break;

        case "png":
          successFlag = exportAsPng(canvas, "PNG FileName");

          break;

        case "svg":
          successFlag = exportAsSVG(canvas, "SVG FileName");

          break;

        case "pdf":
          successFlag = exportAsPDF(canvas, "PDF FileName");

          break;

        default:
          break;
      }

      if (successFlag) {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (e) {
      throw new Error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={"sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className={"apple-display text-[34px]"}>
            Export design.
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <h3 className="mb-3 text-[14px] font-semibold text-[#333]">
            Choose format
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {exportFormats.map((exportFormat) => (
              <button
                type="button"
                key={exportFormat.id}
                className="h-full rounded-[18px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
                onClick={() => setSelectedFormat(exportFormat.id)}
                aria-label={`Select ${exportFormat.name} export format`}
                aria-pressed={selectedFormat === exportFormat.id}
              >
                <Card
                  className={cn(
                    "h-full cursor-pointer border transition-colors hover:bg-accent hover:text-accent-foreground",
                    selectedFormat === exportFormat.id
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                >
                  <CardContent
                    className={"flex flex-col items-center p-4 text-center"}
                  >
                    <exportFormat.icon
                      className={cn(
                        "mb-2 h-8 w-8",
                        selectedFormat === exportFormat.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f]">
                      {exportFormat.name}
                    </h4>
                    <p className="mt-1 text-[12px] font-normal leading-[1.3] text-[#6e6e73]">
                      {exportFormat.description}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-[120px] rounded-full bg-[#0066cc] text-white hover:bg-[#0066cc]/90"
            variant="default"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {selectedFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
