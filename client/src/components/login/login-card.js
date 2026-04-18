"use client";

import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "../ui/button";
import { signIn } from "next-auth/react";

function LoginCard() {
  return (
    <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-7 transition-all duration-300">
      <div className="space-y-7">
        <div>
          <p className="mb-3 text-[14px] font-semibold text-[#6e6e73]">
            AI Pixel Studio
          </p>
          <h3 className="apple-display text-[40px] text-[#1d1d1f]">
            Sign in to create.
          </h3>
          <p className="mt-3 text-[17px] leading-[1.47] text-[#333]">
            Your projects, uploads, and AI thumbnails are saved to your account.
          </p>
        </div>
        <Button
          className="group flex w-full items-center justify-center gap-3 bg-[#0066cc] text-[17px] text-white hover:bg-[#0066cc]/90 hover:text-white"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <div className="flex items-center justify-center">
            <LogIn className="h-4 w-4" />
          </div>
          <span>Continue with Google</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default LoginCard;
