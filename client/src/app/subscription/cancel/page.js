"use client";

function SubscriptionCancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-4 text-[#1d1d1f]">
      <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-8 text-center">
        <h1 className="apple-display mb-3 text-[34px]">
          Payment not completed.
        </h1>
        <p className="text-[17px] leading-[1.47] text-[#333]">
          We could not finish the payment. Please return to AI Pixel Studio and try
          again when you are ready.
        </p>
      </div>
    </div>
  );
}

export default SubscriptionCancel;
