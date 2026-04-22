"use client"

import * as React from "react"
import { Plus, Minus, Copy, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { SingleSelect } from "@/components/ui/single-select"

// ─── Types ─────────────────────────────────────────────────────────────────

export type TimeSlot = { start: string; end: string }

export type DayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"

export type DayAvailability = {
  day: DayKey
  enabled: boolean
  slots: TimeSlot[]
}

export type DayHours = {
  day: DayKey
  enabled: boolean
  hours: number
}

export type AvailabilityValue =
  | { mode: "slots"; days: DayAvailability[] }
  | { mode: "hours"; days: DayHours[] }

// ─── Constants ─────────────────────────────────────────────────────────────

const DAY_ORDER: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

const DAY_LABELS: Record<DayKey, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
}

const DAY_SHORT: Record<DayKey, string> = {
  sunday: "Su",
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
}

const DEFAULT_SLOT: TimeSlot = { start: "09:00", end: "17:00" }
const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const totalMinutes = index * 30
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const hourLabel = ((hour + 11) % 12) + 1
  const minuteLabel = String(minute).padStart(2, "0")
  const period = hour < 12 ? "AM" : "PM"

  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    label: `${hourLabel}:${minuteLabel} ${period}`,
  }
})

export function defaultSlotsAvailability(): DayAvailability[] {
  return DAY_ORDER.map((day) => ({
    day,
    enabled: day !== "sunday" && day !== "saturday",
    slots: [{ ...DEFAULT_SLOT }],
  }))
}

export function defaultHoursAvailability(): DayHours[] {
  return DAY_ORDER.map((day) => ({
    day,
    enabled: day !== "sunday" && day !== "saturday",
    hours: 8,
  }))
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TimeInput({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <SingleSelect
      id={id}
      value={value}
      options={TIME_OPTIONS}
      onChange={onChange}
      triggerClassName={cn(
        "h-9 w-[120px] rounded-xl border border-input bg-background px-3 py-1.5",
        "text-sm font-medium text-foreground tabular-nums",
        "hover:border-primary/50",
      )}
      contentClassName="w-[120px]"
    />
  )
}

function SlotRow({
  slot,
  onChangeStart,
  onChangeEnd,
  onAdd,
  onRemove,
  showCopyToAll,
  onCopyToAll,
  isOnlySlot,
}: {
  slot: TimeSlot
  onChangeStart: (v: string) => void
  onChangeEnd: (v: string) => void
  onAdd: () => void
  onRemove: () => void
  showCopyToAll: boolean
  onCopyToAll?: () => void
  isOnlySlot: boolean
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap relative focus-within:z-10">
      {/* Time range */}
      <div className="flex items-center gap-2">
        <TimeInput value={slot.start} onChange={onChangeStart} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">to</span>
        <TimeInput value={slot.end} onChange={onChangeEnd} />
      </div>

      {/* +/- buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAdd}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          title="Add another slot"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={isOnlySlot}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg border transition-colors",
            isOnlySlot
              ? "border-input/30 text-muted-foreground/30 cursor-not-allowed bg-background"
              : "border-input bg-background text-muted-foreground hover:text-destructive hover:border-destructive/50",
          )}
          title="Remove this slot"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Copy to all */}
      {showCopyToAll && onCopyToAll && (
        <button
          type="button"
          onClick={onCopyToAll}
          className="group/copy flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all duration-500 hover:shadow-lg hover:shadow-primary/30 active:scale-95 ml-auto md:ml-0"
        >
          <Copy className="h-3 w-3 transition-transform group-hover/copy:rotate-12" />
          Apply to all
        </button>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

interface AvailabilitySelectorProps {
  value: AvailabilityValue
  onChange: (value: AvailabilityValue) => void
}

export function AvailabilitySelector({ value, onChange }: AvailabilitySelectorProps) {
  // Defensive check for undefined value
  if (!value) {
    return (
      <div className="py-8 border border-dashed border-border rounded-2xl text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-medium mb-3">No availability data found</p>
        <button
          type="button"
          onClick={() => onChange({ mode: "slots", days: defaultSlotsAvailability() })}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Initialize Schedule
        </button>
      </div>
    )
  }

  const isSlots = value.mode === "slots"
  const slotDays = isSlots ? value.days : defaultSlotsAvailability()
  const hourDays = !isSlots && value.mode === "hours" ? value.days : defaultHoursAvailability()

  const handleModeChange = (newMode: "slots" | "hours") => {
    if (newMode === "slots") {
      onChange({ mode: "slots", days: defaultSlotsAvailability() })
    } else {
      onChange({ mode: "hours", days: defaultHoursAvailability() })
    }
  }

  const handleDayToggle = (dayKey: DayKey, mode: "slots" | "hours") => {
    if (mode === "slots") {
      const updated = slotDays.map((d) =>
        d.day === dayKey ? { ...d, enabled: !d.enabled } : d,
      )
      onChange({ mode: "slots", days: updated })
    } else {
      const updated = hourDays.map((d) =>
        d.day === dayKey ? { ...d, enabled: !d.enabled } : d,
      )
      onChange({ mode: "hours", days: updated })
    }
  }

  const updateHours = (dayKey: DayKey, val: number) => {
    const updated = hourDays.map((d) =>
      d.day === dayKey ? { ...d, hours: val } : d,
    )
    onChange({ mode: "hours", days: updated })
  }

  const updateSlot = (dayKey: DayKey, slotIndex: number, field: "start" | "end", val: string) => {
    if (!isSlots) return
    const updated = slotDays.map((d) => {
      if (d.day !== dayKey) return d
      const newSlots = d.slots.map((s, i) =>
        i === slotIndex ? { ...s, [field]: val } : s,
      )
      return { ...d, slots: newSlots }
    })
    onChange({ mode: "slots", days: updated })
  }

  const addSlot = (dayKey: DayKey) => {
    if (!isSlots) return
    const updated = slotDays.map((d) => {
      if (d.day !== dayKey) return d
      const lastSlot = d.slots[d.slots.length - 1]
      return { ...d, slots: [...d.slots, { ...lastSlot }] }
    })
    onChange({ mode: "slots", days: updated })
  }

  const removeSlot = (dayKey: DayKey, slotIndex: number) => {
    if (!isSlots) return
    const updated = slotDays.map((d) => {
      if (d.day !== dayKey) return d
      if (d.slots.length <= 1) return d
      return { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) }
    })
    onChange({ mode: "slots", days: updated })
  }

  const firstEnabledSlotDay = slotDays.find((d) => d.enabled) ?? null

  const handleCopyToAll = (sourceDay: DayAvailability) => {
    if (!isSlots) return
    const updated = slotDays.map((d) =>
      d.enabled ? { ...d, slots: sourceDay.slots.map((s) => ({ ...s })) } : d,
    )
    onChange({ mode: "slots", days: updated })
  }

  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div className="inline-flex p-1 rounded-xl bg-muted/50 border border-border/50">
        <button
          type="button"
          onClick={() => handleModeChange("slots")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
            isSlots
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Specific Schedule
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("hours")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200",
            !isSlots
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Weekly Hours
        </button>
      </div>

      {/* ── Hours mode ── */}
      {!isSlots && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Day pills */}
          <div className="flex gap-2 flex-wrap">
            {hourDays.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => handleDayToggle(d.day, "hours")}
                className={cn(
                  "h-9 w-9 rounded-lg text-xs font-bold transition-all duration-200",
                  d.enabled
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/50",
                )}
              >
                {DAY_SHORT[d.day]}
              </button>
            ))}
          </div>

          {/* Hours rows */}
          <div className="space-y-5 py-2">
            {hourDays
              .filter((d) => d.enabled)
              .map((dayHours) => (
                <div
                  key={dayHours.day}
                  className="grid grid-cols-[120px_1fr] gap-4 items-center relative focus-within:z-10"
                >
                  <span className="text-sm font-bold text-foreground">
                    {DAY_LABELS[dayHours.day]}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={dayHours.hours}
                      onChange={(e) =>
                        updateHours(dayHours.day, Math.min(24, Math.max(1, Number(e.target.value))))
                      }
                      className={cn(
                        "h-9 w-16 rounded-xl border border-input bg-background px-2",
                        "text-sm font-semibold text-center text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                      )}
                    />
                    <span className="text-sm text-muted-foreground font-medium">hrs</span>
                  </div>
                </div>
              ))}
          </div>

          {hourDays.every((d) => !d.enabled) && (
            <div className="py-10 text-center rounded-xl border border-dashed border-border/50 bg-muted/20">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Select days to set your hours</p>
            </div>
          )}
        </div>
      )}

      {/* ── Slots mode ── */}
      {isSlots && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Day pills */}
          <div className="flex gap-2 flex-wrap">
            {slotDays.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => handleDayToggle(d.day, "slots")}
                className={cn(
                  "h-9 w-9 rounded-lg text-xs font-bold transition-all duration-200",
                  d.enabled
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/50",
                )}
              >
                {DAY_SHORT[d.day]}
              </button>
            ))}
          </div>

          {/* Slot rows */}
          <div className="space-y-6 py-2">
            {slotDays
              .filter((d) => d.enabled)
              .map((dayAvail) => {
                const isTopDay = firstEnabledSlotDay?.day === dayAvail.day
                return (
                  <div
                    key={dayAvail.day}
                    className="grid grid-cols-[120px_1fr] gap-4 items-start relative focus-within:z-10"
                  >
                    <span className="text-sm font-bold text-foreground pt-1.5">
                      {DAY_LABELS[dayAvail.day]}
                    </span>
                    <div className="space-y-3">
                      {dayAvail.slots.map((slot, si) => (
                        <SlotRow
                          key={si}
                          slot={slot}
                          onChangeStart={(v) => updateSlot(dayAvail.day, si, "start", v)}
                          onChangeEnd={(v) => updateSlot(dayAvail.day, si, "end", v)}
                          onAdd={() => addSlot(dayAvail.day)}
                          onRemove={() => removeSlot(dayAvail.day, si)}
                          isOnlySlot={dayAvail.slots.length === 1}
                          showCopyToAll={isTopDay && si === dayAvail.slots.length - 1}
                          onCopyToAll={() => handleCopyToAll(dayAvail)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>

          {slotDays.every((d) => !d.enabled) && (
            <div className="py-10 text-center rounded-xl border border-dashed border-border/50 bg-muted/20">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Select days to build your schedule</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
