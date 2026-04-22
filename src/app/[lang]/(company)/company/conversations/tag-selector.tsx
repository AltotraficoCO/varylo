'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toggleConversationTag } from "./actions";
import { toast } from "sonner";
import { useDictionary } from '@/lib/i18n-context';

interface TagData {
    id: string;
    name: string;
    color: string;
}

interface TagSelectorProps {
    conversationId: string;
    availableTags: TagData[];
    selectedTags: TagData[];
}

export function TagSelector({ conversationId, availableTags, selectedTags }: TagSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const dict = useDictionary();
    const t = dict.conversations || {};

    const handleToggle = async (tagId: string) => {
        try {
            await toggleConversationTag(conversationId, tagId);
            // Optimistic update is hard without managing state locally deeply,
            // but server action revalidates path, so UI should update.
        } catch (error) {
            toast.error(t.errorUpdateTag);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                    <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
                        variant="outline"
                        className="gap-1 pr-1"
                    >
                        {tag.name}
                        <button
                            onClick={() => handleToggle(tag.id)}
                            className="hover:bg-black/10 rounded-full p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <Plus className="h-4 w-4" /> {t.addTag}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={t.searchTag} />
                        <CommandList>
                            <CommandEmpty>{t.noTagsFound}</CommandEmpty>
                            <CommandGroup>
                                {availableTags.map((tag) => {
                                    const isSelected = selectedTags.some(t => t.id === tag.id);
                                    return (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.name}
                                            onSelect={() => {
                                                handleToggle(tag.id);
                                                // setOpen(false); // Keep open to select multiple
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                {tag.name}
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
