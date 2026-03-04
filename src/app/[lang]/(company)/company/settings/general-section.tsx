'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Building2, Users, Bell } from 'lucide-react';
import { AssignmentForm } from './assignment-form';

type GeneralItem = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge: string;
    badgeVariant: 'default' | 'secondary' | 'outline';
    status: 'active' | 'coming_soon';
};

type GeneralSectionProps = {
    companyName: string;
    userEmail: string;
    assignmentStrategy: string;
    specificAgentId: string | null;
    agents: { id: string; name: string | null; email: string }[];
};

export function GeneralSection({
    companyName,
    userEmail,
    assignmentStrategy,
    specificAgentId,
    agents,
}: GeneralSectionProps) {
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const items: GeneralItem[] = [
        {
            id: 'profile',
            name: 'Perfil de Empresa',
            description: 'Información básica de tu empresa como nombre y correo.',
            icon: Building2,
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            badge: companyName || 'Sin nombre',
            badgeVariant: 'default',
            status: 'active',
        },
        {
            id: 'assignment',
            name: 'Asignación de Agentes',
            description: 'Configura cómo se asignan las conversaciones a los agentes.',
            icon: Users,
            color: 'bg-violet-50 text-violet-600 border-violet-200',
            badge: assignmentStrategy === 'SPECIFIC_AGENT' ? 'Agente específico' : 'Menos ocupado',
            badgeVariant: 'default',
            status: 'active',
        },
        {
            id: 'notifications',
            name: 'Notificaciones',
            description: 'Configura alertas por email y notificaciones de escritorio.',
            icon: Bell,
            color: 'bg-amber-50 text-amber-600 border-amber-200',
            badge: 'Próximamente',
            badgeVariant: 'outline',
            status: 'coming_soon',
        },
    ];

    if (activeItem === 'profile') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a general
                </Button>
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre de Empresa</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm"
                                    defaultValue={companyName}
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm"
                                    defaultValue={userEmail}
                                    disabled
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (activeItem === 'assignment') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveItem(null)}
                    className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a general
                </Button>
                <AssignmentForm
                    currentStrategy={assignmentStrategy as any}
                    currentAgentId={specificAgentId}
                    agents={agents}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Configuración general de tu empresa.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        className={`transition-all ${
                            item.status === 'active'
                                ? 'cursor-pointer hover:shadow-md hover:border-primary/40'
                                : 'opacity-60'
                        }`}
                        onClick={() => item.status === 'active' && setActiveItem(item.id)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg border ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <Badge variant={item.badgeVariant} className="text-xs">
                                    {item.badge}
                                </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{item.name}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>
                            {item.status === 'active' && (
                                <div className="mt-4 flex items-center text-sm text-primary font-medium gap-1">
                                    Configurar
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
