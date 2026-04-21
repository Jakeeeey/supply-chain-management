"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Sparkles, Command } from "lucide-react";

interface CommandPaletteProps {
    subsystems: {
        id: string;
        title: string;
        href?: string;
        status: "active" | "comingSoon";
    }[];
}

export function CommandPalette({ subsystems }: CommandPaletteProps) {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const onSelect = (href?: string) => {
        if (!href) return;
        setOpen(false);
        router.push(href);
    };

    return (
        <>
             <button
                onClick={() => setOpen(true)}
                className="group flex items-center gap-2 rounded-2xl border bg-background px-3 py-1.5 text-xs font-bold tracking-tight text-muted-foreground transition-all hover:border-zinc-900/10 dark:hover:border-white/10 hover:shadow-md active:scale-95 shadow-sm"
            >
                <Command className="h-3 w-3" />
                <span>Search Subsystems</span>
                <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded-lg border bg-muted/50 px-1.5 font-mono text-[9px] font-black opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a subsystem name..." />
                <CommandList className="max-h-[300px]">
                    <CommandEmpty>No subsystems found.</CommandEmpty>
                    <CommandGroup heading="Available Subsystems">
                        {subsystems
                            .filter((s) => s.status === "active" && s.href)
                            .map((sub) => (
                                <CommandItem
                                    key={sub.id}
                                    onSelect={() => onSelect(sub.href)}
                                    className="cursor-pointer gap-3 py-3"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-primary">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold tracking-tight">{sub.title}</span>
                                </CommandItem>
                            ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
