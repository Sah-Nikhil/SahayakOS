"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SingleSelect, type SingleSelectOption } from "@/components/ui/single-select";
import { Button } from "@/components/ui/button";
import { ApplyModal } from "@/components/apply-modal";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Search,
  User,
  Briefcase,
} from "lucide-react";

type NgoWithOpportunities = Doc<"ngos"> & {
  opportunities: Doc<"opportunities">[];
};

type OpportunityStatus = "open" | "filled" | "closed";
const volunteerOpportunityStatuses: OpportunityStatus[] = ["open", "filled"];

const getLogoInitials = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const LOGO_COLORS = [
  "bg-emerald-500 text-white",
  "bg-blue-500 text-white",
  "bg-amber-400 text-zinc-900",
  "bg-violet-500 text-white",
  "bg-rose-500 text-white",
  "bg-teal-500 text-white",
  "bg-orange-500 text-white",
  "bg-cyan-500 text-white",
];

const getLogoColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
};

const urgencyLabel = (urgency: string) => {
  switch (urgency) {
    case "high":
      return "Urgent";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return urgency;
  }
};

const locationModeLabel = (type: string) => {
  switch (type) {
    case "hq":
      return "Onsite (HQ)";
    case "field":
      return "Field";
    case "remote":
      return "Remote";
    default:
      return type;
  }
};

function OpportunityCard({
  opportunity,
  className,
  onApply,
}: {
  opportunity: Doc<"opportunities">;
  className?: string;
  onApply?: (opportunityId: string, title: string, location: string) => void;
}) {
  const isFilled = opportunity.status === "filled";

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 shadow-[6px_6px_20px] backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5",
        isFilled
          ? "border-amber-500/30 bg-amber-500/5 shadow-amber-950/5 hover:border-amber-500/40"
          : "border-border/50 bg-card/50 shadow-foreground/3 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold leading-tight text-foreground">{opportunity.title}</h4>
          {isFilled ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Filled role — kept visible for context
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onApply?.(opportunity._id, opportunity.title, opportunity.location.city)}
          disabled={isFilled}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isFilled ? `${opportunity.title} (Filled)` : `Apply to ${opportunity.title}`}
          title={isFilled ? "This opportunity has been filled" : "Apply to this opportunity"}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 text-foreground">{opportunity.taskType}</span>
        <span>·</span>
        <span>{urgencyLabel(opportunity.urgency)}</span>
        <span>·</span>
        <Badge
          variant={isFilled ? "secondary" : "outline"}
          className={cn("h-6 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide", isFilled ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "")}
        >
          {isFilled ? "Filled" : "Open"}
        </Badge>
        <span>·</span>
        <span>{locationModeLabel(opportunity.location.type)}</span>
        <span>·</span>
        <span>{opportunity.location.city}</span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{opportunity.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-primary">
          {opportunity.volunteersRequired} volunteer{opportunity.volunteersRequired !== 1 ? "s" : ""} needed
        </span>
        {opportunity.requiredSkills.slice(0, 4).map((skill) => (
          <Badge
            key={`${opportunity._id}-${skill}`}
            className="h-6 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/80"
          >
            {skill}
          </Badge>
        ))}
        {opportunity.requiredSkills.length > 4 ? (
          <span className="text-xs text-muted-foreground">+{opportunity.requiredSkills.length - 4} more</span>
        ) : null}
      </div>
    </article>
  );
}

const ROLE_OPTIONS: SingleSelectOption[] = [
  { label: "All Roles", value: "all" },
  { label: "Education", value: "Education" },
  { label: "Health", value: "Health" },
  { label: "Environment", value: "Environment" },
  { label: "Disaster Relief", value: "Disaster Relief" },
  { label: "Animal Welfare", value: "Animal Welfare" },
  { label: "Elderly Care", value: "Elderly Care" },
  { label: "Food Security", value: "Food Security" },
  { label: "Community Development", value: "Community Development" },
  { label: "Human Rights", value: "Human Rights" },
];

type NGOSidebarProps = {
  cityName?: string;
  className?: string;
};

export function NGOSidebar({ cityName, className }: NGOSidebarProps) {
  const [selectedRole, setSelectedRole] = useState("all");
  const [applyModalState, setApplyModalState] = useState<{
    isOpen: boolean;
    opportunityId?: string;
    title?: string;
    location?: string;
  }>({ isOpen: false });
  const ngosWithOpportunities = useQuery(api.queries.getNGOsWithOpportunities, {
    city: cityName,
    taskType: selectedRole === "all" ? undefined : selectedRole,
    statuses: volunteerOpportunityStatuses,
  });
  const [selectedNgoId, setSelectedNgoId] = useState<Id<"ngos"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const ngos: NgoWithOpportunities[] = ngosWithOpportunities ?? [];

  const filteredNgos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ngos;
    return ngos.filter(
      (ngo) =>
        ngo.name.toLowerCase().includes(query) ||
        ngo.focusAreas.some((area) => area.toLowerCase().includes(query)) ||
        ngo.hqLocation.city.toLowerCase().includes(query),
    );
  }, [ngos, searchQuery]);

  const selectedNgo = useMemo(
    () => ngos.find((ngo) => ngo._id === selectedNgoId) ?? null,
    [ngos, selectedNgoId],
  );

  const isLoading = ngosWithOpportunities === undefined;

  const handleApply = (opportunityId: string, title: string, location: string) => {
    setApplyModalState({ isOpen: true, opportunityId, title, location });
  };

  const handleCloseApplyModal = () => {
    setApplyModalState({ isOpen: false });
  };

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
          key={`ngo-detail-${selectedNgo._id}`}
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
                  getLogoColor(selectedNgo._id),
                )}
              >
                {getLogoInitials(selectedNgo.name)}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{selectedNgo.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedNgo.hqLocation.city}{selectedNgo.hqLocation.state ? `, ${selectedNgo.hqLocation.state}` : ""}, {selectedNgo.hqLocation.country}
              </p>
            </div>
          </div>

          {selectedNgo.description ? (
            <div className="mt-5 border-t border-border/50 pt-5">
              <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">About</h4>
              <p className="mt-3 text-sm leading-7 text-foreground">{selectedNgo.description}</p>
            </div>
          ) : null}

          <div className="mt-5">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Office</h4>
            <div className="mt-3 rounded-2xl border border-border/50 bg-card/50 p-4 shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm leading-7 text-foreground">
                    {selectedNgo.hqLocation.city}{selectedNgo.hqLocation.state ? `, ${selectedNgo.hqLocation.state}` : ""}, {selectedNgo.hqLocation.country}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{selectedNgo.hqLocation.city}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Open Opportunities
            </h4>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {selectedNgo.opportunities.length} role{selectedNgo.opportunities.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-3 space-y-3 pb-5">
            {selectedNgo.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No opportunities listed yet.</p>
            ) : (
              selectedNgo.opportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity._id}
                  opportunity={opportunity}
                  onApply={handleApply}
                  className={cn(
                    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
                    index > 0 ? "motion-safe:delay-75" : "",
                  )}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div
          key="ngo-list"
          className="ngo-pane-enter-left flex h-full flex-col"
        >
          <div className="flex items-start justify-between px-5 pb-3 pt-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">NGOs</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Click on an NGO to view opportunities</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/applications"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:border-primary/30 hover:text-foreground active:scale-[0.97]"
                aria-label="View my applications"
                title="View my applications"
              >
                <Briefcase className="h-4 w-4" />
              </Link>
              <Link
                href="/profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-muted-foreground transition-all duration-200 hover:scale-[1.03] hover:border-primary/30 hover:text-foreground active:scale-[0.97]"
                aria-label="Open profile"
              >
                <User className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-3 border-y border-border/50 px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search NGOs or causes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 rounded-xl border border-border/60 bg-card/50 pl-9 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <SingleSelect
              options={ROLE_OPTIONS}
              value={selectedRole}
              onChange={(value) => setSelectedRole(value)}
              placeholder="Filter by role"
              triggerClassName="h-10 rounded-xl border-border/60 bg-card/50"
            />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading NGOs...</p>
            ) : filteredNgos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim() ? "No NGOs match your search." : "No NGOs found."}
              </p>
            ) : (
              filteredNgos.map((ngo) => (
                <button
                  key={ngo._id}
                  type="button"
                  onClick={() => setSelectedNgoId(ngo._id)}
                  className="group w-full rounded-2xl border border-border/50 bg-card/50 p-4 text-left shadow-[6px_6px_20px] shadow-foreground/3 backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card/70 active:scale-[0.995]"
                >
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background p-1">
                      <div
                        className={cn(
                          "flex h-full w-full items-center justify-center rounded-lg text-xs font-semibold",
                          getLogoColor(ngo._id),
                        )}
                      >
                        {getLogoInitials(ngo.name)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-xl font-semibold leading-tight text-foreground">{ngo.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            {ngo.opportunities.length} role{ngo.opportunities.length !== 1 ? "s" : ""}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {ngo.hqLocation.city}{ngo.hqLocation.state ? `, ${ngo.hqLocation.state}` : ""}, {ngo.hqLocation.country}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        {ngo.focusAreas.slice(0, 2).map((tag) => (
                          <Badge
                            key={`${ngo._id}-${tag}`}
                            className="h-6 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground hover:bg-muted/80"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {ngo.focusAreas.length > 2 ? (
                          <span className="text-xs text-muted-foreground">+{ngo.focusAreas.length - 2} more</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <ApplyModal
        isOpen={applyModalState.isOpen}
        onClose={handleCloseApplyModal}
        opportunityId={applyModalState.opportunityId || ""}
        opportunityTitle={applyModalState.title}
        opportunityLocation={applyModalState.location}
      />
    </aside>
  );
}
