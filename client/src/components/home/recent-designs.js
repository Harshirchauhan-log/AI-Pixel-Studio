"use client";

import { useEditorStore } from "@/store";
import DesignList from "./design-list";

function RecentDesigns() {
  const { userDesigns, userDesignsLoading } = useEditorStore();
  const visibleDesigns = userDesigns?.slice(0, 4) || [];

  return (
    <section className="bg-white px-6 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 text-center">
          <h2 className="apple-display text-[34px] text-[#1d1d1f] md:text-[40px]">
            Recent Designs
          </h2>
        </div>
        <DesignList
          listOfDesigns={visibleDesigns}
          isLoading={userDesignsLoading}
          isModalView={false}
          emptyMessage="No designs yet. Start with a canvas above."
        />
      </div>
    </section>
  );
}

export default RecentDesigns;
