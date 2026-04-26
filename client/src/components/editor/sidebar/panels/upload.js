"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addImageToCanvas } from "@/fabric/fabric-utils";
import { fetchWithAuth } from "@/services/base-service";
import { uploadFileWithAuth } from "@/services/upload-service";
import { useEditorStore } from "@/store";
import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useReducer, useState } from "react";

const initialUploadState = {
  status: "idle",
  uploads: [],
};

function uploadReducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "loaded":
      return { status: "loaded", uploads: action.uploads };
    case "prepend":
      return {
        status: "loaded",
        uploads: [action.upload, ...state.uploads],
      };
    default:
      return state;
  }
}

function UploadPanel() {
  const { canvas } = useEditorStore();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, dispatchUploads] = useReducer(
    uploadReducer,
    initialUploadState
  );

  const { data: session, status } = useSession();

  const fetchUserUploads = useCallback(async () => {
    if (status !== "authenticated" || !session?.idToken) return;

    try {
      dispatchUploads({ type: "loading" });
      const data = await fetchWithAuth("/v1/media/get");
      console.log(data, "fetchUserUploads");
      dispatchUploads({ type: "loaded", uploads: data?.data || [] });
    } catch (e) {
      console.error(e);
      dispatchUploads({ type: "loaded", uploads: [] });
    }
  }, [status, session?.idToken]);

  useEffect(() => {
    if (status === "authenticated") fetchUserUploads();
  }, [status, fetchUserUploads]);

  const handleFileUpload = async (e) => {
    console.log(e.target.files);
    const file = e.target.files[0];

    setIsUploading(true);

    try {
      const result = await uploadFileWithAuth(file);

      dispatchUploads({ type: "prepend", upload: result?.data });

      console.log(result);
    } catch (e) {
      console.error("Error while uploading the file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddImage = (imageUrl) => {
    if (!canvas) return;
    addImageToCanvas(canvas, imageUrl);
  };

  const isLoading =
    status === "authenticated" && uploadState.status !== "loaded";

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Label
            htmlFor="upload-files"
            className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0066cc] px-4 py-3 text-white transition-colors hover:bg-[#0066cc]/90 ${
            isUploading ? "opacity-70 cursor-not-allowed" : ""
          }
          `}
          >
            <Upload className="w-5 h-5" />
            <span>{isUploading ? "Uploading..." : "Upload Files"}</span>
            <Input
              id="upload-files"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </Label>
        </div>
        <div className="mt-5">
          <h4 className="mb-5 text-[14px] font-semibold text-[#333]">
            Your uploads
          </h4>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-[#f5f5f7] p-6">
              <Loader2 className="h-4 w-4 animate-spin text-[#0066cc]" />
              <p className="text-[14px] text-[#6e6e73]">Loading uploads...</p>
            </div>
          ) : uploadState.uploads.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {uploadState.uploads.map((imageData) => (
                <button
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-[18px] border border-black/10 bg-[#f5f5f7] transition-opacity hover:opacity-85"
                  key={imageData._id}
                  onClick={() => handleAddImage(imageData.url)}
                  aria-label={`Add ${imageData.name || "uploaded image"} to canvas`}
                >
                  <Image
                    src={imageData.url}
                    alt={imageData.name || "Uploaded image"}
                    fill
                    unoptimized
                    sizes="100px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-black/10 bg-[#f5f5f7] p-6 text-center text-[14px] text-[#6e6e73]">
              No uploads yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadPanel;
