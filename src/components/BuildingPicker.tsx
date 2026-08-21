"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Building = {
  id: string;
  name: string;
};

const CATEGORY_ORDER = [
  "Colleges & Schools",
  "Lecture & Teaching",
  "Library & Research",
  "Halls of Residence",
  "Gates & Landmarks",
  "Other",
];

function categoryOf(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes("college") ||
    lower.includes("school") ||
    lower.includes("cedat") ||
    lower.includes("cocis") ||
    lower.includes("chuss") ||
    lower.includes("conas") ||
    lower.includes("caes") ||
    lower.includes("cees") ||
    lower.includes("covab") ||
    lower.includes("cobams") ||
    lower.includes("health sciences")
  ) {
    return "Colleges & Schools";
  }
  if (
    lower.includes("lecture") ||
    lower.includes("ctf") ||
    lower.includes("teaching") ||
    lower.includes("block") ||
    lower.includes("frank kalimuzo") ||
    lower.includes("technology") ||
    lower.includes("science") ||
    lower.includes(" humanities ")
  ) {
    return "Lecture & Teaching";
  }
  if (lower.includes("library") || lower.includes("research")) {
    return "Library & Research";
  }
  if (lower.includes("hall") || lower.includes("hostel") || lower.includes("residence")) {
    return "Halls of Residence";
  }
  if (
    lower.includes("gate") ||
    lower.includes("square") ||
    lower.includes("monument") ||
    lower.includes("statue") ||
    lower.includes("roundabout") ||
    lower.includes("freedom")
  ) {
    return "Gates & Landmarks";
  }
  return "Other";
}

type BuildingPickerProps = {
  buildings: Building[];
  value: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
};

export function BuildingPicker({
  buildings,
  value,
  onSelect,
  placeholder = "Pick a building",
  className,
}: BuildingPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = buildings.find((b) => b.id === value);

  const grouped = useMemo(() => {
    const groups: Record<string, Building[]> = {};
    for (const b of buildings) {
      const cat = categoryOf(b.name);
      groups[cat] ??= [];
      groups[cat].push(b);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [buildings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    const out: Record<string, Building[]> = {};
    for (const [cat, list] of Object.entries(grouped)) {
      const matches = list.filter((b) => b.name.toLowerCase().includes(q));
      if (matches.length) out[cat] = matches;
    }
    return out;
  }, [grouped, search]);

  const categories = CATEGORY_ORDER.filter((c) => filtered[c]?.length);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "mt-2 w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Choose a building</DialogTitle>
        </DialogHeader>
        <Command className="flex-1 overflow-hidden" shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search Makerere buildings…"
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[60dvh] overflow-y-auto px-2 pb-4">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No building matches “{search}”
            </CommandEmpty>
            {categories.map((cat) => (
              <CommandGroup key={cat} heading={cat} className="pt-2">
                {filtered[cat].map((b) => (
                  <CommandItem
                    key={b.id}
                    value={b.id}
                    onSelect={() => {
                      onSelect(b.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center justify-between rounded-md px-2 py-3 text-base"
                  >
                    <span className="truncate pr-2">{b.name}</span>
                    {value === b.id ? (
                      <Check className="h-4 w-4 shrink-0 text-accent-foreground" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
