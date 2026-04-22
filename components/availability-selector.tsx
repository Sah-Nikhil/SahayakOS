"use client"

import * as React from "react"
import { Plus, Minus, Copy, Clock, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

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

export type AvailabilityValue =
  | { mode: "slots"; days: DayAvailability[] }
  | { mode: "hours"; totalHoursPerWeek: number }

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

export function defaultSlotsAvailability(): DayAvailability[] {
  return DAY_ORDER.map((day) => ({
    day,
    enabled: day !== "sunday" && day !== "saturday",
    slots: [{ ...DEFAULT_SLOT }],
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
    <div className="group relative">
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-14 w-[160px] rounded-2xl border-2 border-border/50 bg-background/50 px-5 py-2",
          "text-lg font-bold text-foreground tabular-nums tracking-tight shadow-sm",
          "focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background",
          "transition-all duration-300 hover:border-primary/40 hover:bg-background cursor-pointer",
          "appearance-none",
          // hide native time picker icon but keep it functional
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
        )}
      />
      <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-primary/30 group-hover:text-primary/60 transition-colors duration-300">
        <Clock className="h-5 w-5" />
      </div>
    </div>
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
    <div className="flex items-center gap-6 flex-wrap py-2 group/row">
      <div className="flex items-center gap-4 bg-primary/5 p-1.5 rounded-[22px] border border-primary/10 shadow-sm transition-all duration-300 group-hover/row:shadow-md group-hover/row:border-primary/20">
        <TimeInput value={slot.start} onChange={onChangeStart} />
        <div className="flex flex-col items-center justify-center">
          <div className="h-px w-4 bg-primary/20" />
          <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] py-1">to</span>
          <div className="h-px w-4 bg-primary/20" />
        </div>
        <TimeInput value={slot.end} onChange={onChangeEnd} />
      </div>

      <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
        <button
          type="button"
          onClick={onAdd}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-background text-primary shadow-sm hover:bg-primary hover:text-white transition-all duration-300 active:scale-90"
          title="Add another slot"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={isOnlySlot}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-300 active:scale-90",
            isOnlySlot
              ? "text-muted-foreground/20 cursor-not-allowed bg-transparent"
              : "bg-background text-destructive/60 shadow-sm hover:bg-destructive hover:text-white",
          )}
          title="Remove this slot"
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {showCopyToAll && onCopyToAll && (
        <button
          type="button"
          onClick={onCopyToAll}
          className="group/copy flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all duration-500 shadow-sm hover:shadow-lg hover:shadow-primary/30 active:scale-95 ml-auto md:ml-0"
        >
          <Copy className="h-4 w-4 transition-transform group-hover/copy:rotate-12" />
          Apply to all days
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
      <div className="p-8 border-2 border-dashed border-border/50 rounded-3xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-4">
          <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium mb-4">No availability data found</p>
        <button 
          type="button" 
          onClick={() => onChange({ mode: "slots", days: defaultSlotsAvailability() })}
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all active:scale-95"
        >
          Initialize Schedule
        </button>
      </div>
    )
  }

  const isSlots = value.mode === "slots"
  const days = isSlots ? value.days : defaultSlotsAvailability()
  const totalHours = !isSlots && value.mode === "hours" ? value.totalHoursPerWeek : 40

  const handleModeChange = (newMode: "slots" | "hours") => {
    if (newMode === "slots") {
      onChange({ mode: "slots", days: defaultSlotsAvailability() })
    } else {
      onChange({ mode: "hours", totalHoursPerWeek: 40 })
    }
  }

  const handleDayToggle = (dayKey: DayKey) => {
    if (!isSlots) return
    const updated = days.map((d) =>
      d.day === dayKey ? { ...d, enabled: !d.enabled } : d,
    )
    onChange({ mode: "slots", days: updated })
  }

  const updateSlot = (dayKey: DayKey, slotIndex: number, field: "start" | "end", val: string) => {
    if (!isSlots) return
    const updated = days.map((d) => {
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
    const updated = days.map((d) => {
      if (d.day !== dayKey) return d
      const lastSlot = d.slots[d.slots.length - 1]
      return { ...d, slots: [...d.slots, { ...lastSlot }] }
    })
    onChange({ mode: "slots", days: updated })
  }

  const removeSlot = (dayKey: DayKey, slotIndex: number) => {
    if (!isSlots) return
    const updated = days.map((d) => {
      if (d.day !== dayKey) return d
      if (d.slots.length <= 1) return d
      return { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) }
    })
    onChange({ mode: "slots", days: updated })
  }

  const firstEnabledDay = days.find((d) => d.enabled) ?? null

  const handleCopyToAll = (sourceDay: DayAvailability) => {
    if (!isSlots) return
    const updated = days.map((d) =>
      d.enabled ? { ...d, slots: sourceDay.slots.map((s) => ({ ...s })) } : d,
    )
    onChange({ mode: "slots", days: updated })
  }

  return (
    <div className="space-y-8">
      {/* Mode Toggle Switch */}
      <div className="relative inline-flex p-1.5 rounded-[20px] bg-muted/40 border border-border/50 shadow-inner">
        <button
          type="button"
          onClick={() => handleModeChange("slots")}
          className={cn(
            "relative z-10 px-6 py-2.5 rounded-[15px] text-sm font-black transition-all duration-500",
            isSlots ? "text-primary shadow-xl bg-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Specific Schedule
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("hours")}
          className={cn(
            "relative z-10 px-6 py-2.5 rounded-[15px] text-sm font-black transition-all duration-500",
            !isSlots ? "text-primary shadow-xl bg-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Weekly Hours
        </button>
      </div>

      {!isSlots && (
        <div className="p-8 rounded-[32px] bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-[24px] bg-background flex items-center justify-center shadow-xl shadow-primary/10">
              <Clock className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">How many hours?</h3>
              <p className="text-muted-foreground font-medium">Set your total weekly volunteer capacity.</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={1}
                max={168}
                value={totalHours}
                onChange={(e) => onChange({ mode: "hours", totalHoursPerWeek: Number(e.target.value) })}
                className={cn(
                  "h-20 w-32 rounded-[28px] border-2 border-primary/20 bg-background px-4",
                  "text-4xl font-black text-primary tabular-nums text-center shadow-2xl shadow-primary/5",
                  "focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all duration-500",
                )}
              />
              <span className="text-xl font-bold text-muted-foreground">hrs / week</span>
            </div>
          </div>
        </div>
      )}

      {isSlots && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Day Selector Bubbles */}
          <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
            {days.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => handleDayToggle(d.day)}
                className={cn(
                  "h-14 w-14 rounded-2xl text-sm font-black transition-all duration-500 active:scale-90",
                  d.enabled
                    ? "bg-primary text-white shadow-2xl shadow-primary/40 rotate-3"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground -rotate-3",
                )}
              >
                {DAY_SHORT[d.day]}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="space-y-4">
            {days
              .filter((d) => d.enabled)
              .map((dayAvail) => {
                const isTopDay = firstEnabledDay?.day === dayAvail.day
                return (
                  <div key={dayAvail.day} className="p-6 rounded-[32px] bg-background border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 group/day">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      <div className="w-40 shrink-0">
                        <div className="inline-flex px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-black uppercase tracking-widest mb-1">
                          {DAY_LABELS[dayAvail.day]}
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold px-1">Set work windows</p>
                      </div>
                      <div className="space-y-4 flex-1">
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
                  </div>
                )
              })}
          </div>

          {days.every((d) => !d.enabled) && (
            <div className="py-20 text-center rounded-[40px] border-2 border-dashed border-border/50 bg-muted/20">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-bold text-muted-foreground">Select days to build your schedule</p>
              <p className="text-sm text-muted-foreground/60">Your availability will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
