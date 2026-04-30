"use client";

import { capturePaypalOrder } from "@/services/subscription-service";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const orderId = searchParams.get("token");

    const processPayment = async () => {
      try {
        if (!orderId) {
          throw new Error("Missing PayPal order token");
        }

        const response = await capturePaypalOrder(orderId);

        if (response.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (e) {
        setStatus("error");
      }
    };

    processPayment();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f7] p-4 text-[#1d1d1f]">
      <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-8">
        {status === "processing" && (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#0066cc]" />
            <h1 className="apple-display mb-2 text-[34px]">
              Processing payment.
            </h1>
            <p className="mb-4 text-[17px] leading-[1.47] text-[#333]">
              Please wait while we confirm your subscription.
            </p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center text-center">
            <h1 className="apple-display mb-2 text-[34px]">
              Payment failed.
            </h1>
            <p className="mb-4 text-[17px] leading-[1.47] text-[#333]">
              We could not confirm your payment. Please return to AI Pixel Studio and
              try again.
            </p>
          </div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center text-center">
            <h1 className="apple-display mb-2 text-[34px]">
              Payment confirmed.
            </h1>
            <p className="mb-5 text-[17px] leading-[1.47] text-[#333]">
              Your premium subscription is active.
            </p>
            <Button asChild className="bg-[#0066cc] text-white hover:bg-[#0066cc]/90">
              <Link href="/">Go to dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionSuccess() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
          <Loader2 className="h-10 w-10 animate-spin text-[#0066cc]" />
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}

export default SubscriptionSuccess;
