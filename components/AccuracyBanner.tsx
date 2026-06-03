const BANNER_LINE =
  "Validated on 151 papers · 70 official College Board · 71 expert-generated · 10 real student papers · AP Seminar + AP Research";

export function AccuracyBanner() {
  return (
    <div className="w-full bg-[#f0f0f1] text-[#6b6b70]">
      <div className="mx-auto flex h-9 max-h-9 w-full max-w-3xl items-center px-6">
        <p className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[11px] leading-none tracking-tight sm:text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BANNER_LINE}
        </p>
      </div>
    </div>
  );
}
