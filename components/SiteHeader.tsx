import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="border-b border-surface-border bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          {siteConfig.name}
        </span>
      </div>
    </header>
  );
}
