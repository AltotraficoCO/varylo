'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createChatbot } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useDictionary } from '@/lib/i18n-context';

interface Channel {
    id: string;
    type: string;
}

export function CreateChatbotDialog({ channels, trigger }: { channels: Channel[]; trigger?: ReactNode }) {
    const dict = useDictionary();
    const t = dict.chatbots || {};
    const [state, action, isPending] = useActionState(createChatbot, undefined);
    const [open, setOpen] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const router = useRouter();
    const { lang } = useParams();

    useEffect(() => {
        if (state?.startsWith('Success:')) {
            const chatbotId = state.replace('Success:', '');
            setOpen(false);
            setSelectedChannels([]);
            router.push(`/${lang}/company/chatbots/${chatbotId}`);
        }
    }, [state, router, lang]);

    const toggleChannel = (channelId: string) => {
        setSelectedChannels(prev =>
            prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg px-5 py-2.5">
                        <Plus className="mr-2 h-4 w-4" />
                        {t.newChatbot}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t.newChatbotTitle}</DialogTitle>
                    <DialogDescription>
                        {t.newChatbotDesc}
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="chatbot-name">{dict.ui?.name}</Label>
                        <Input
                            id="chatbot-name"
                            name="name"
                            placeholder={t.chatbotNamePlaceholder}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t.channels}</Label>
                        <div className="space-y-2 rounded-md border p-3">
                            {channels.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t.noChannelsConfigured}</p>
                            ) : (
                                channels.map(channel => (
                                    <div key={channel.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`chatbot-channel-${channel.id}`}
                                            checked={selectedChannels.includes(channel.id)}
                                            onCheckedChange={() => toggleChannel(channel.id)}
                                        />
                                        <input
                                            type="hidden"
                                            name="channelIds"
                                            value={channel.id}
                                            disabled={!selectedChannels.includes(channel.id)}
                                        />
                                        <Label htmlFor={`chatbot-channel-${channel.id}`} className="font-normal cursor-pointer">
                                            {channel.type}
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {state && (
                        <div className={`text-sm text-center ${state.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                            {state}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.createChatbotBtn}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
