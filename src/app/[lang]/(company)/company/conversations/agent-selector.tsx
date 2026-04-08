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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toggleConversationAgent } from "./actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from '@/lib/i18n-context';

interface Agent {
    id: string;
    name: string | null;
    email: string;
}

interface AgentSelectorProps {
    conversationId: string;
    availableAgents: Agent[];
    selectedAgents: Agent[];
}

export function AgentSelector({ conversationId, availableAgents, selectedAgents }: AgentSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const dict = useDictionary();
    const t = dict.conversations || {};

    const handleToggle = async (agentId: string) => {
        try {
            await toggleConversationAgent(conversationId, agentId);
        } catch (error) {
            toast.error(t.errorUpdateAgent);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedAgents.map(agent => (
                    <div
                        key={agent.id}
                        className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-white border rounded-full shadow-sm"
                    >
                        <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] font-medium bg-blue-100 text-blue-700">
                                {agent.name?.[0]?.toUpperCase() || 'A'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[100px] text-xs font-medium text-gray-700">{agent.name || agent.email}</span>
                        <button
                            onClick={() => handleToggle(agent.id)}
                            className="ml-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-9"
                    >
                        <span className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Plus className="h-4 w-4" /> {t.assignAgent}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={t.searchAgent} />
                        <CommandList>
                            <CommandEmpty>{t.noAgentsFound}</CommandEmpty>
                            <CommandGroup>
                                {availableAgents.map((agent) => {
                                    const isSelected = selectedAgents.some(a => a.id === agent.id);
                                    return (
                                        <CommandItem
                                            key={agent.id}
                                            value={agent.name || agent.email}
                                            onSelect={() => handleToggle(agent.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[10px]">{agent.name?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[120px] text-xs">{agent.name || agent.email}</span>
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
