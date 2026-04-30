"use client";

import { useEditorStore } from "@/store";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import {
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { createPaypalOrder } from "@/services/subscription-service";
import Image from "next/image";
import { useState } from "react";

const features = [
  {
    icon: Crown,
    title: "Premium assets",
    description: "Access more templates, images, and reusable design parts.",
  },
  {
    icon: Palette,
    title: "Brand tools",
    description: "Keep colors, typography, and assets consistent.",
  },
  {
    icon: Clock,
    title: "Faster production",
    description: "Use advanced editing tools for repeat design work.",
  },
];

function formatPremiumSince(premiumSince) {
  if (!premiumSince) return "recently";

  const date = new Date(premiumSince);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString();
}

function SubscriptionModal({ isOpen, onClose }) {
  const { userSubscription } = useEditorStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await createPaypalOrder();

      if (response.success) {
        window.location.href = response.data.approvalLink;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={"gap-0 overflow-hidden rounded-[18px] p-0 sm:max-w-[900px]"}>
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 bg-white p-6 md:p-8">
            {userSubscription?.isPremium ? (
              <>
                <DialogTitle
                  className={"apple-display mb-4 flex items-center text-[34px] text-[#1d1d1f]"}
                >
                  <Sparkles className="h-6 w-6 text-[#0066cc] mr-2" />
                  Premium is active.
                </DialogTitle>
                <div className="mb-6 rounded-[18px] border border-[#0066cc]/20 bg-[#0066cc]/5 p-4">
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-[#0066cc]" />
                    <p className="text-[15px] font-normal text-[#1d1d1f]">
                      Premium active since{" "}
                      {formatPremiumSince(userSubscription?.premiumSince)}
                    </p>
                  </div>
                </div>

                <p className="mb-6 text-[17px] leading-[1.47] text-[#333]">
                  You have access to the full creative toolset.
                </p>
              </>
            ) : (
              <>
                <DialogTitle
                  className={"apple-display mb-4 text-[34px] text-[#1d1d1f]"}
                >
                  Upgrade AI Pixel Studio.
                </DialogTitle>
                <p className="mb-6 text-[17px] leading-[1.47] text-[#333]">
                  Create more projects, use premium assets, and keep design
                  work moving without limits.
                </p>
                <div className="space-y-3">
                  {features.map((feature) => (
                    <div
                      key={feature.title}
                      className="flex items-start gap-3 rounded-[18px] border border-black/10 bg-[#f5f5f7] p-4"
                    >
                      <feature.icon className="mt-0.5 h-5 w-5 text-[#0066cc]" />
                      <div>
                        <p className="text-[15px] font-semibold text-[#1d1d1f]">
                          {feature.title}
                        </p>
                        <p className="mt-1 text-[14px] leading-[1.43] text-[#333]">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-2">
                  <Button
                    className={"w-full bg-[#0066cc] text-white hover:bg-[#0066cc]/90"}
                    disabled={isLoading}
                    onClick={handleUpgrade}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="hidden md:block md:w-[450px]">
            <Image
              src="/team-collaboration-blog.jpg"
              alt="Team collaboration around puzzle pieces"
              width={450}
              height={600}
              className="h-full w-full object-cover object-center"
              priority
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SubscriptionModal;
