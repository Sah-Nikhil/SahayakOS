"use client";

import { FieldDescription } from "@/components/ui/field";
import { SingleSelect } from "@/components/ui/single-select";

export type SkillPriorityEntry = {
  skill: string;
  priority: number;
};

const PRIORITY_OPTIONS = [
  { label: "1 - Highest", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5 - Lowest", value: "5" },
];

type SkillPriorityMatrixEditorProps = {
  value: SkillPriorityEntry[];
  onChange: (value: SkillPriorityEntry[]) => void;
};

export function SkillPriorityMatrixEditor({ value, onChange }: SkillPriorityMatrixEditorProps) {
  if (value.length === 0) {
    return (
      <FieldDescription>
        Select required skills first. Each selected skill gets its own priority dropdown.
      </FieldDescription>
    );
  }

  return (
    <div className="space-y-3">
      {value.map((entry, index) => (
        <div key={entry.skill} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px]">
          <div className="flex min-h-9 items-center rounded-3xl border border-border/40 bg-muted/30 px-3 text-sm font-medium text-foreground">
            {entry.skill}
          </div>
          <SingleSelect
            value={String(entry.priority)}
            options={PRIORITY_OPTIONS}
            onChange={(priority) =>
              onChange(
                value.map((currentEntry, currentIndex) =>
                  currentIndex === index
                    ? { ...currentEntry, priority: Number(priority) }
                    : currentEntry,
                ),
              )
            }
            placeholder="Priority"
            ariaLabel={`${entry.skill} priority`}
            triggerClassName="h-9 rounded-3xl border border-input bg-background"
          />
        </div>
      ))}
    </div>
  );
}
