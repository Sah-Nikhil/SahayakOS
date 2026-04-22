"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, HelpCircle, MapPin, Search } from "lucide-react";

export type NGOSidebarCompany = {
  id: string;
  name: string;
  location: string;
  rolesCount: number;
  tags: string[];
  extraTagsCount: number;
  logoText: string;
  logoClassName?: string;
};

type NGOSidebarProps = {
  className?: string;
  companies?: NGOSidebarCompany[];
};

const MOCK_COMPANIES: NGOSidebarCompany[] = [
  {
    id: "1mg",
    name: "1MG",
    location: "Okhla",
    rolesCount: 6,
    tags: ["phlebotomy", "healthcare"],
    extraTagsCount: 22,
    logoText: "1MG",
    logoClassName: "bg-rose-500 text-black",
  },
  {
    id: "bharatpe",
    name: "BharatPe",
    location: "Gurugram",
    rolesCount: 9,
    tags: ["Sales", "Training"],
    extraTagsCount: 39,
    logoText: "BP",
    logoClassName: "bg-cyan-500 text-white",
  },
  {
    id: "bitspeed",
    name: "Bitspeed",
    location: "Gurgaon",
    rolesCount: 11,
    tags: ["cold calling", "sales"],
    extraTagsCount: 24,
    logoText: "B",
    logoClassName: "bg-blue-500 text-white",
  },
  {
    id: "blinkit",
    name: "Blinkit",
    location: "Gurgaon",
    rolesCount: 8,
    tags: ["Java", "Spring Boot"],
    extraTagsCount: 35,
    logoText: "BK",
    logoClassName: "bg-yellow-400 text-zinc-900",
  },
  {
    id: "bobble-ai",
    name: "Bobble AI",
    location: "Gurugram",
    rolesCount: 5,
    tags: ["Product Mgmt", "UX Research"],
    extraTagsCount: 22,
    logoText: "BA",
    logoClassName: "bg-zinc-200 text-zinc-900",
  },
];

export function NGOSidebar({ className, companies = MOCK_COMPANIES }: NGOSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-[390px] flex-col border-r border-border/50 bg-background/95 text-foreground backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between px-5 pb-3 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">NGOs in Delhi</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Tap a NGO to view details</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Sidebar help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 border-y border-border/50 px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies or tags..."
            className="h-10 rounded-xl border border-border/60 bg-card/50 pl-9 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <span>Filter by role</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {companies.map((company) => (
          <button
            key={company.id}
            type="button"
            className="w-full rounded-2xl border border-border/50 bg-card/50 p-4 text-left shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm transition hover:border-primary/30 hover:bg-card/70"
          >
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background p-1">
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-lg text-xs font-semibold",
                    company.logoClassName ?? "bg-zinc-200 text-zinc-900",
                  )}
                >
                  {company.logoText}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="truncate text-xl font-semibold leading-tight text-foreground">{company.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {company.rolesCount} roles
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{company.location}</span>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  {company.tags.map((tag) => (
                    <Badge
                      key={`${company.id}-${tag}`}
                      className="h-6 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/80"
                    >
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">+{company.extraTagsCount} more</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
