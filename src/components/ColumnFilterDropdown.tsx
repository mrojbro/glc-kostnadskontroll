"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__empty__";

interface ColumnFilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyLabel?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export function ColumnFilterDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel = "Saknas",
}: ColumnFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const padding = 8;
    const maxLeft = window.innerWidth - menuWidth - padding;
    const left = Math.min(Math.max(padding, rect.left), maxLeft);

    setPosition({
      top: rect.bottom + 6,
      left,
      width: menuWidth,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const display = option === EMPTY_VALUE ? emptyLabel : option;
      return display.toLowerCase().includes(q);
    });
  }, [emptyLabel, options, query]);

  const active = selected.length > 0;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayLabel = (value: string) =>
    value === EMPTY_VALUE ? emptyLabel : value;

  const menu =
    mounted &&
    open &&
    position &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 1000,
        }}
        className="rounded-xl border border-[#3a3a3a] bg-[#242424] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Sök ${label.toLowerCase()}…`}
          className="mb-2 h-8 w-full rounded-lg border border-[#3a3a3a] bg-[#202020] px-2.5 text-xs text-white placeholder:text-[#b8b8b8] outline-none focus:border-[#eb6e08]"
          autoFocus
        />

        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            className="text-xs text-[#eb6e08] hover:underline"
            onClick={() => onChange(options)}
          >
            Alla
          </button>
          <button
            type="button"
            className="text-xs text-[#b8b8b8] hover:text-white"
            onClick={() => onChange([])}
          >
            Rensa
          </button>
        </div>

        <ul className="max-h-56 overflow-y-auto overscroll-contain">
          {filteredOptions.length === 0 ? (
            <li className="px-2 py-3 text-xs text-[#b8b8b8]">Inga träffar</li>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => toggle(option)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white",
                      "hover:bg-[#2a2218]",
                      isSelected && "bg-[#2a2218]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-[#eb6e08] bg-[#eb6e08] text-white"
                          : "border-[#3a3a3a] bg-[#202020]"
                      )}
                    >
                      {isSelected && <Check className="size-3" aria-hidden />}
                    </span>
                    <span className="truncate" title={displayLabel(option)}>
                      {displayLabel(option)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>,
      document.body
    );

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        title={`Filtrera ${label}`}
        aria-label={`Filtrera ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md p-0.5",
          "hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
          active && "bg-black/20"
        )}
      >
        <Filter
          className={cn("size-3.5", active ? "text-white" : "text-white/75")}
          aria-hidden
        />
        <ChevronDown className="size-3 opacity-80" aria-hidden />
        {active && (
          <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[10px] font-semibold leading-4 text-white">
            {selected.length}
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}

export { EMPTY_VALUE };
