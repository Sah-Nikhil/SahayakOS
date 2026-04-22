"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  triggerClassName,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const [maxListHeight, setMaxListHeight] = React.useState<number>(240)
  const [inputValue, setInputValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleUnselect = (item: string) => {
    onChange(selected.filter((s) => s !== item))
  }

  const handleSelect = (value: string) => {
    if (!selected.includes(value)) {
      onChange([...selected, value])
    }
    setInputValue("")
  }

  const filteredOptions = options.filter(
    (option) =>
      !selected.includes(option.value) &&
      option.label.toLowerCase().includes(inputValue.toLowerCase())
  )

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
      const estimatedListHeight = Math.min(filteredOptions.length * 36 + 8, 320)
      const spaceBelow = viewportHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const shouldOpenUpward =
        spaceBelow < Math.min(estimatedListHeight, 220) && spaceAbove > spaceBelow
      const availableHeight = shouldOpenUpward ? spaceAbove : spaceBelow
      setOpenUpward(shouldOpenUpward)
      setMaxListHeight(Math.max(120, Math.min(320, availableHeight)))
    }

    updatePlacement()
    window.addEventListener("resize", updatePlacement)
    window.addEventListener("scroll", updatePlacement, true)
    return () => {
      window.removeEventListener("resize", updatePlacement)
      window.removeEventListener("scroll", updatePlacement, true)
    }
  }, [open, filteredOptions.length])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", open && "z-[100]", className)}
    >
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap gap-1 rounded-3xl border border-transparent bg-input/50 px-3 py-1.5 text-sm transition-[color,box-shadow,background-color]",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          open && "border-ring ring-3 ring-ring/30",
          triggerClassName,
        )}
        onClick={() => {
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        {selected.map((item) => {
          const option = options.find((o) => o.value === item)
          return (
            <Badge
              key={item}
              variant="secondary"
              className="flex items-center gap-1 rounded-lg bg-secondary/70 hover:bg-secondary"
            >
              {option?.label || item}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(item)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          )
        })}
        <input
          ref={inputRef}
          placeholder={selected.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && filteredOptions.length > 0 && (
        <div
          className={cn(
            "absolute z-[100] w-full rounded-2xl border border-border bg-popover/95 shadow-md backdrop-blur-sm overflow-hidden",
            openUpward ? "bottom-full mb-2" : "top-full mt-2",
          )}
          role="listbox"
        >
          <div
            className="overflow-y-auto px-1 pt-1 pb-1.5 [scroll-padding-block:0.25rem]"
            style={{ maxHeight: maxListHeight }}
          >
            <div className="flex flex-col gap-px">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="relative flex w-full cursor-default select-none items-center rounded-xl px-2.5 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
