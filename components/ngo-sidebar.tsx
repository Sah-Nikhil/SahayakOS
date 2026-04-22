"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Search,
  User,
} from "lucide-react";

export type NGOOpportunity = {
  id: string;
  title: string;
  category: string;
  level: "Entry" | "Mid" | "Senior";
  engagement: "Full-time" | "Part-time" | "Volunteer";
  mode: "Onsite" | "Hybrid" | "Remote";
  location: string;
  summary: string;
  compensation?: string;
  tags: string[];
};

export type NGOSidebarNGO = {
  id: string;
  name: string;
  location: string;
  about: string;
  officeAddress: string;
  officeArea: string;
  focusTags: string[];
  extraTagsCount: number;
  logoText: string;
  logoClassName?: string;
  opportunities: NGOOpportunity[];
};

type NGOSidebarProps = {
  className?: string;
  ngos?: NGOSidebarNGO[];
};

const MOCK_NGOS: NGOSidebarNGO[] = [
  {
    id: "goonj",
    name: "Goonj",
    location: "Sarita Vihar, Delhi",
    about:
      "Goonj channels urban surplus materials into rural development, supporting dignity-led initiatives in education, health, and livelihoods.",
    officeAddress: "B-27, Sarita Vihar Community Centre, New Delhi - 110076",
    officeArea: "Sarita Vihar",
    focusTags: ["community outreach", "field work"],
    extraTagsCount: 14,
    logoText: "GO",
    logoClassName: "bg-emerald-500 text-white",
    opportunities: [
      {
        id: "goonj-field-coordinator",
        title: "Field Coordinator",
        category: "Programs",
        level: "Entry",
        engagement: "Full-time",
        mode: "Onsite",
        location: "South Delhi",
        summary:
          "Coordinate collection drives, partner meetings, and field distribution with local stakeholders.",
        compensation: "₹3.6L - ₹4.8L per year",
        tags: ["community engagement", "operations", "reporting"],
      },
      {
        id: "goonj-volunteer-lead",
        title: "Volunteer Engagement Lead",
        category: "Community",
        level: "Mid",
        engagement: "Part-time",
        mode: "Hybrid",
        location: "Okhla",
        summary:
          "Design volunteer onboarding and recurring participation programs for city-level initiatives.",
        tags: ["volunteer management", "facilitation", "partnerships"],
      },
    ],
  },
  {
    id: "teach-for-india",
    name: "Teach For India",
    location: "Vasant Kunj, Delhi",
    about:
      "Teach For India develops leaders committed to educational equity through classroom fellowships and community programs.",
    officeAddress: "A-4, Vasant Kunj Institutional Area, New Delhi - 110070",
    officeArea: "Vasant Kunj",
    focusTags: ["education", "teacher support"],
    extraTagsCount: 11,
    logoText: "TFI",
    logoClassName: "bg-blue-500 text-white",
    opportunities: [
      {
        id: "tfi-program-associate",
        title: "Program Associate",
        category: "Education",
        level: "Entry",
        engagement: "Full-time",
        mode: "Onsite",
        location: "South Delhi",
        summary:
          "Support classroom fellows with planning, school coordination, and student progress tracking.",
        tags: ["curriculum", "school partnerships", "mentoring"],
      },
      {
        id: "tfi-content-specialist",
        title: "Learning Content Specialist",
        category: "Content",
        level: "Mid",
        engagement: "Full-time",
        mode: "Hybrid",
        location: "Delhi NCR",
        summary:
          "Build student-centered learning resources and support teacher training sessions across cohorts.",
        compensation: "₹5.2L - ₹7.5L per year",
        tags: ["content design", "education research", "training"],
      },
    ],
  },
  {
    id: "pratham",
    name: "Pratham",
    location: "Connaught Place, Delhi",
    about:
      "Pratham focuses on large-scale learning outcomes and skilling programs for children and youth in underserved communities.",
    officeAddress: "N-5, Connaught Place, New Delhi - 110001",
    officeArea: "Connaught Place",
    focusTags: ["literacy", "youth skilling"],
    extraTagsCount: 9,
    logoText: "PR",
    logoClassName: "bg-amber-400 text-zinc-900",
    opportunities: [
      {
        id: "pratham-community-fellow",
        title: "Community Learning Fellow",
        category: "Education",
        level: "Entry",
        engagement: "Volunteer",
        mode: "Onsite",
        location: "North Delhi",
        summary:
          "Run small-group reading and numeracy sessions and track outcomes for neighborhood learning centers.",
        tags: ["teaching", "assessment", "community work"],
      },
      {
        id: "pratham-ops-manager",
        title: "Program Operations Manager",
        category: "Operations",
        level: "Senior",
        engagement: "Full-time",
        mode: "Hybrid",
        location: "Delhi NCR",
        summary:
          "Own delivery planning, partner communication, and execution quality for city-wide programs.",
        compensation: "₹10L - ₹14L per year",
        tags: ["operations", "stakeholder management", "strategy"],
      },
    ],
  },
];

function OpportunityCard({
  opportunity,
  className,
}: {
  opportunity: NGOOpportunity;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 p-4 shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm",
        "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold leading-tight text-foreground">{opportunity.title}</h4>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground"
          aria-label={`Open ${opportunity.title}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 text-foreground">{opportunity.category}</span>
        <span>·</span>
        <span>{opportunity.level}</span>
        <span>·</span>
        <span>{opportunity.engagement}</span>
        <span>·</span>
        <span>{opportunity.mode}</span>
        <span>·</span>
        <span>{opportunity.location}</span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{opportunity.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {opportunity.compensation ? (
          <span className="text-sm font-semibold text-primary">{opportunity.compensation}</span>
        ) : null}
        {opportunity.tags.map((tag) => (
          <Badge
            key={`${opportunity.id}-${tag}`}
            className="h-6 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/80"
          >
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  );
}

export function NGOSidebar({ className, ngos = MOCK_NGOS }: NGOSidebarProps) {
  const [selectedNgoId, setSelectedNgoId] = useState<string | null>(null);

  const selectedNgo = useMemo(() => ngos.find((ngo) => ngo.id === selectedNgoId) ?? null, [ngos, selectedNgoId]);

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-[390px] flex-col border-r border-border/50 bg-background/95 text-foreground backdrop-blur-sm",
        "transition-colors duration-200",
        className,
      )}
    >
      {selectedNgo ? (
        <div
          key={`ngo-detail-${selectedNgo.id}`}
          className="ngo-pane-enter-right flex h-full flex-col overflow-y-auto px-5 py-5"
        >
          <button
            type="button"
            onClick={() => setSelectedNgoId(null)}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>All NGOs</span>
          </button>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background p-1">
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-lg text-xs font-semibold",
                  selectedNgo.logoClassName ?? "bg-zinc-200 text-zinc-900",
                )}
              >
                {selectedNgo.logoText}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{selectedNgo.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedNgo.location}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-border/50 pt-5">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">About</h4>
            <p className="mt-3 text-sm leading-7 text-foreground">{selectedNgo.about}</p>
          </div>

          <div className="mt-5">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Office</h4>
            <div className="mt-3 rounded-2xl border border-border/50 bg-card/50 p-4 shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm leading-7 text-foreground">{selectedNgo.officeAddress}</p>
                  <p className="mt-1 text-sm font-semibold text-primary">{selectedNgo.officeArea}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Open Opportunities
            </h4>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {selectedNgo.opportunities.length} roles
            </span>
          </div>

          <div className="mt-3 space-y-3 pb-5">
            {selectedNgo.opportunities.map((opportunity, index) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                className={cn(
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
                  index > 0 ? "motion-safe:delay-75" : "",
                )}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          key="ngo-list"
          className="ngo-pane-enter-left flex h-full flex-col"
        >
          <div className="flex items-start justify-between px-5 pb-3 pt-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">NGOs in Delhi</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Click on an NGO to view opportunities</p>
            </div>
            <Link
              href="/profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:border-primary/30 hover:text-foreground active:scale-[0.97]"
              aria-label="Open profile"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3 border-y border-border/50 px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search NGOs or causes..."
                className="h-10 rounded-xl border border-border/60 bg-card/50 pl-9 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-3 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/25 hover:bg-accent"
            >
              <span>Filter by role</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {ngos.map((ngo) => (
              <button
                key={ngo.id}
                type="button"
                onClick={() => setSelectedNgoId(ngo.id)}
                className="group w-full rounded-2xl border border-border/50 bg-card/50 p-4 text-left shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/70 active:scale-[0.995]"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background p-1">
                    <div
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-lg text-xs font-semibold",
                        ngo.logoClassName ?? "bg-zinc-200 text-zinc-900",
                      )}
                    >
                      {ngo.logoText}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-xl font-semibold leading-tight text-foreground">{ngo.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          {ngo.opportunities.length} roles
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{ngo.location}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      {ngo.focusTags.map((tag) => (
                        <Badge
                          key={`${ngo.id}-${tag}`}
                          className="h-6 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/80"
                        >
                          {tag}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">+{ngo.extraTagsCount} more</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
