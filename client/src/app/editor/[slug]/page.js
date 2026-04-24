"use client";

import MainEditor from "@/components/editor";
import { getUserDesigns } from "@/services/design-service";
import { getUserSubscription } from "@/services/subscription-service";
import { useEditorStore } from "@/store";
import { useEffect } from "react";

export default function EditorPage() {
  const { setUserSubscription, setUserDesigns } = useEditorStore();

  useEffect(() => {
    const fetchUserSubscription = async () => {
      const response = await getUserSubscription();

      if (response.success) setUserSubscription(response.data);
    };

    const fetchUserDesigns = async () => {
      const result = await getUserDesigns();

      if (result?.success) setUserDesigns(result?.data);
    };

    fetchUserSubscription();
    fetchUserDesigns();
  }, [setUserDesigns, setUserSubscription]);
  return <MainEditor />;
}
