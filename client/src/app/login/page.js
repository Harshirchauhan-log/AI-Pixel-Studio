import LoginCard from "@/components/login/login-card";

function Login() {
  return (
    <div className="relative min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div
        className="absolute inset-x-0 top-0 h-[44px] bg-black"
        aria-hidden="true"
      />
      <div className="absolute left-6 top-0 z-10 flex h-[44px] items-center text-[12px] text-white/90">
        AI Pixel Studio
      </div>
      <main className="grid min-h-screen grid-cols-1 pt-[44px] lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex items-center justify-center bg-white px-6 py-16">
          <div className="w-full max-w-[760px] text-center">
            <p className="mb-3 text-[14px] font-semibold text-[#6e6e73]">
              Creative workspace
            </p>
            <h1 className="apple-display text-[44px] text-[#1d1d1f] sm:text-[56px]">
              Design, generate, and refine in one quiet place.
            </h1>
          </div>
        </section>
        <section
          className="flex items-center justify-center bg-[#f5f5f7] px-6 py-16"
        >
          <LoginCard />
        </section>
      </main>
    </div>
  );
}

export default Login;
