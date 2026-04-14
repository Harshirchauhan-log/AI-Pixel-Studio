"use client";

import AiFeatures from "@/components/home/ai-features";
import Banner from "@/components/home/banner";
import DesignTypes from "@/components/home/design-types";
import DesignModal from "@/components/home/designs-modal";
import Header from "@/components/home/header";
import RecentDesigns from "@/components/home/recent-designs";
import SideBar from "@/components/home/sidebar";
import SubscriptionModal from "@/components/subscription/premium-modal";
import { getUserDesigns } from "@/services/design-service";
import { getUserSubscription } from "@/services/subscription-service";
import { useEditorStore } from "@/store";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Home() {
  const {
    setUserSubscription,
    setUserDesigns,
    showPremiumModal,
    setShowPremiumModal,
    showDesignsModal,
    setShowDesignsModal,
    userDesigns,
    setUserDesignsLoading,
    userDesignsLoading,
  } = useEditorStore();

  useEffect(() => {
    const handleAuthError = (error) => {
      if (
        error.message === "Invalid Token!" ||
        error.message === "Not authenticated"
      ) {
        toast.error("Your session expired. Please sign in again.");
        signOut({ callbackUrl: "/login" });
        return true;
      }

      return false;
    };

    const fetchUserSubscription = async () => {
      try {
        const response = await getUserSubscription();

        if (response.success) setUserSubscription(response.data);
      } catch (error) {
        if (!handleAuthError(error)) {
          toast.error(error.message || "Failed to load subscription");
        }
      }
    };

    const fetchUserDesigns = async () => {
      setUserDesignsLoading(true);

      try {
        const result = await getUserDesigns();

        if (result?.success) {
          setUserDesigns(result?.data);
        }
      } catch (error) {
        if (!handleAuthError(error)) {
          toast.error(error.message || "Failed to load designs");
        }
      } finally {
        setUserDesignsLoading(false);
      }
    };

    fetchUserSubscription();
    fetchUserDesigns();
  }, [setUserDesigns, setUserDesignsLoading, setUserSubscription]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-16 text-[#1d1d1f] md:pb-0">
      <SideBar />
      <div className="min-h-screen md:pl-[72px]">
        <Header />
        <main className="flex w-full flex-col gap-0 pt-[96px]">
          <Banner />
          <DesignTypes />
          <AiFeatures />
          <RecentDesigns />
        </main>
      </div>
      <SubscriptionModal
        isOpen={showPremiumModal}
        onClose={setShowPremiumModal}
      />
      <DesignModal
        isOpen={showDesignsModal}
        onClose={setShowDesignsModal}
        userDesigns={userDesigns}
        setShowDesignsModal={setShowDesignsModal}
        userDesignsLoading={userDesignsLoading}
      />
    </div>
  );
}
