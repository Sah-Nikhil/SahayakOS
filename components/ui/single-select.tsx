"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

export type SingleSelectOption = {
  label: string
  value: string
}

type SingleSelectProps = {
  options: SingleSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  id?: string
  ariaLabel?: string
}

export function SingleSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  id,
  ariaLabel,
}: SingleSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const [maxListHeight, setMaxListHeight] = React.useState<number>(240)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (!open) {
      return
    }

    const updatePlacement = () => {
      if (!containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const margin = 12
      const estimatedListHeight = Math.min(options.length * 36 + 8, 320)
      const spaceBelow = viewportHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const shouldOpenUpward =
        spaceBelow < Math.min(estimatedListHeight, 220) && spaceAbove > spaceBelow
      const availableHeight = shouldOpenUpward ? spaceAbove : spaceBelow
      setOpenUpward(shouldOpenUpward)
      setMaxListHeight(Math.max(120, Math.min(320, availableHeight)))
    }

    updatePlacement()

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("resize", updatePlacement)
    window.addEventListener("scroll", updatePlacement, true)
    document.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("resize", updatePlacement)
      window.removeEventListener("scroll", updatePlacement, true)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, options.length])

  return (
    <div ref={containerRef} className={cn("relative w-full", open && "z-[100]", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-3xl border border-transparent bg-input/50 px-3 text-sm transition-[color,box-shadow,background-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-3 ring-ring/30",
          triggerClassName,
        )}
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && options.length > 0 ? (
        <div
          className={cn(
            "absolute z-[100] w-full rounded-2xl border border-border bg-popover/95 shadow-md backdrop-blur-sm overflow-hidden",
            openUpward ? "bottom-full mb-2" : "top-full mt-2",
            contentClassName,
          )}
          role="listbox"
        >
          <div
            className="overflow-y-auto px-1 pt-1 pb-1.5 [scroll-padding-block:0.25rem]"
            style={{ maxHeight: maxListHeight }}
          >
            <div className="flex flex-col gap-px">
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors outline-none",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
