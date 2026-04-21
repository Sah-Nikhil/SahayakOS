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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

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
          "flex min-h-10 w-full flex-wrap gap-1 rounded-2xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => setOpen(true)}
      >
        {selected.map((item) => {
          const option = options.find((o) => o.value === item)
          return (
            <Badge
              key={item}
              variant="secondary"
              className="flex items-center gap-1 rounded-lg bg-secondary/50 hover:bg-secondary/70"
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
          placeholder={selected.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && filteredOptions.length > 0 && (
        <div className="absolute top-full z-[100] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-border bg-background/95 p-1 shadow-md backdrop-blur-sm">
          <div className="flex flex-col gap-px">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="relative flex w-full cursor-default select-none items-center rounded-xl py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
