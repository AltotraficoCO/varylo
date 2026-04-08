'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContactAvatar } from '@/components/contact-avatar';
import { Plus, X, Loader2, DollarSign, User, CalendarDays, MoreHorizontal, Trophy, XCircle, GripVertical, CheckCircle2, Ban } from 'lucide-react';
import { createDeal, moveDeal, updateDealStatus, deleteDeal, reopenDeal } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Deal = {
    id: string;
    title: string;
    value: number;
    probability: number;
    status: string;
    expectedCloseAt: string | null;
    notes: string | null;
    createdAt: string;
    contact: { id: string; name: string | null; phone: string } | null;
    assignedTo: { id: string; name: string | null } | null;
    _count: { quotes: number };
};

type Stage = {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    deals: Deal[];
};

type Contact = { id: string; name: string | null; phone: string };
type Agent = { id: string; name: string | null };

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function DealCard({ deal, stageColor }: { deal: Deal; stageColor: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
    const [showMenu, setShowMenu] = useState(false);
    const router = useRouter();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="bg-white rounded-xl border border-[#E4E4E7] p-3.5 space-y-2.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#D4D4D8] transition-all group"
        >
            {/* Drag handle + title */}
            <div className="flex items-start gap-2">
                <span {...listeners} className="mt-1 text-[#D4D4D8] group-hover:text-[#A1A1AA] cursor-grab">
                    <GripVertical className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#09090B] truncate">{deal.title}</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-7 bg-white border border-[#E4E4E7] rounded-lg shadow-lg py-1 z-10 w-36">
                            <button onClick={async () => { await updateDealStatus(deal.id, 'WON'); toast.success('Deal ganado!'); router.refresh(); }} className="w-full px-3 py-1.5 text-left text-[13px] text-[#10B981] hover:bg-[#ECFDF5] flex items-center gap-2">
                                <Trophy className="h-3 w-3" /> Marcar ganado
                            </button>
                            <button onClick={async () => { await updateDealStatus(deal.id, 'LOST'); toast.success('Deal perdido'); router.refresh(); }} className="w-full px-3 py-1.5 text-left text-[13px] text-[#F59E0B] hover:bg-[#FFFBEB] flex items-center gap-2">
                                <XCircle className="h-3 w-3" /> Marcar perdido
                            </button>
                            <div className="h-px bg-[#F4F4F5] my-1" />
                            <button onClick={async () => { if (confirm('Eliminar este deal?')) { await deleteDeal(deal.id); router.refresh(); } }} className="w-full px-3 py-1.5 text-left text-[13px] text-[#EF4444] hover:bg-[#FEF2F2]">
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Value */}
            {deal.value > 0 && (
                <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3 text-[#10B981]" />
                    <span className="text-[14px] font-bold text-[#10B981]">{formatCOP(deal.value)}</span>
                </div>
            )}

            {/* Contact + Agent */}
            <div className="flex items-center justify-between">
                {deal.contact ? (
                    <div className="flex items-center gap-1.5">
                        <ContactAvatar name={deal.contact.name || deal.contact.phone} className="h-5 w-5 text-[8px]" />
                        <span className="text-[12px] text-[#71717A] truncate max-w-[100px]">{deal.contact.name || deal.contact.phone}</span>
                    </div>
                ) : (
                    <span className="text-[12px] text-[#A1A1AA]">Sin contacto</span>
                )}
                {deal.expectedCloseAt && (
                    <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {new Date(deal.expectedCloseAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>

            {/* Probability bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#F4F4F5] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${deal.probability}%`, backgroundColor: stageColor }} />
                </div>
                <span className="text-[11px] text-[#A1A1AA] font-medium">{deal.probability}%</span>
            </div>
        </div>
    );
}

function StageColumn({ stage, contacts, agents }: { stage: Stage; contacts: Contact[]; agents: Agent[] }) {
    const { setNodeRef } = useDroppable({ id: stage.id });
    const [showAddDeal, setShowAddDeal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newDeal, setNewDeal] = useState({ title: '', value: '', contactId: '', assignedToId: '' });
    const router = useRouter();

    const totalValue = stage.deals.reduce((sum, d) => sum + d.value, 0);

    async function handleAddDeal() {
        if (!newDeal.title.trim()) return;
        setSaving(true);
        await createDeal({
            stageId: stage.id,
            title: newDeal.title.trim(),
            value: parseFloat(newDeal.value) || 0,
            contactId: newDeal.contactId || undefined,
            assignedToId: newDeal.assignedToId || undefined,
        });
        setNewDeal({ title: '', value: '', contactId: '', assignedToId: '' });
        setShowAddDeal(false);
        setSaving(false);
        router.refresh();
    }

    return (
        <div className="flex flex-col w-[300px] shrink-0">
            {/* Stage header */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl" style={{ backgroundColor: stage.color + '10' }}>
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-[14px] font-semibold text-[#09090B]">{stage.name}</span>
                    <span className="text-[12px] text-[#A1A1AA] bg-white rounded-full px-2 py-0.5 font-medium">{stage.deals.length}</span>
                </div>
                {totalValue > 0 && (
                    <span className="text-[12px] font-medium" style={{ color: stage.color }}>{formatCOP(totalValue)}</span>
                )}
            </div>

            {/* Deals container */}
            <div
                ref={setNodeRef}
                className="flex-1 bg-[#FAFAFA] rounded-b-xl border border-[#E4E4E7] border-t-0 p-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]"
            >
                <SortableContext items={stage.deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    {stage.deals.map(deal => (
                        <DealCard key={deal.id} deal={deal} stageColor={stage.color} />
                    ))}
                </SortableContext>

                {/* Add deal form */}
                {showAddDeal ? (
                    <div className="bg-white rounded-xl border border-[#E4E4E7] p-3 space-y-2.5">
                        <Input
                            value={newDeal.title}
                            onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))}
                            placeholder="Nombre del deal"
                            className="h-9 text-[13px] rounded-lg"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleAddDeal(); if (e.key === 'Escape') setShowAddDeal(false); }}
                        />
                        <Input
                            value={newDeal.value}
                            onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))}
                            placeholder="Valor (COP)"
                            type="number"
                            className="h-9 text-[13px] rounded-lg"
                        />
                        <select
                            value={newDeal.contactId}
                            onChange={e => setNewDeal(p => ({ ...p, contactId: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-[#E4E4E7] bg-white px-2 text-[13px]"
                        >
                            <option value="">Contacto (opcional)</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name || c.phone}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <Button onClick={handleAddDeal} disabled={saving} size="sm" className="flex-1 h-8 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[12px]">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Crear'}
                            </Button>
                            <Button onClick={() => setShowAddDeal(false)} variant="outline" size="sm" className="h-8 rounded-lg text-[12px]">
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAddDeal(true)}
                        className="w-full py-2 rounded-lg border border-dashed border-[#D4D4D8] text-[13px] text-[#A1A1AA] hover:text-[#09090B] hover:border-[#A1A1AA] hover:bg-white transition-all flex items-center justify-center gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" /> Agregar deal
                    </button>
                )}
            </div>
        </div>
    );
}

type ClosedDeal = {
    id: string;
    title: string;
    value: number;
    status: string;
    closedAt: string;
    contactName: string | null;
    stageName: string | null;
};

export function PipelineBoard({ stages, contacts, agents, closedDeals, lang }: { stages: Stage[]; contacts: Contact[]; agents: Agent[]; closedDeals: ClosedDeal[]; lang: string }) {
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
    const [activeStageColor, setActiveStageColor] = useState('#3B82F6');
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    function handleDragStart(event: DragStartEvent) {
        const dealId = event.active.id as string;
        for (const stage of stages) {
            const found = stage.deals.find(d => d.id === dealId);
            if (found) {
                setActiveDeal(found);
                setActiveStageColor(stage.color);
                break;
            }
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveDeal(null);
        const { active, over } = event;
        if (!over) return;

        const dealId = active.id as string;
        const overId = over.id as string;

        // Find which stage the deal was dropped on
        let targetStageId = overId;
        // If dropped on another deal, find its stage
        for (const stage of stages) {
            if (stage.deals.some(d => d.id === overId)) {
                targetStageId = stage.id;
                break;
            }
        }

        // Find current stage
        let currentStageId = '';
        for (const stage of stages) {
            if (stage.deals.some(d => d.id === dealId)) {
                currentStageId = stage.id;
                break;
            }
        }

        if (currentStageId !== targetStageId) {
            await moveDeal(dealId, targetStageId);
            router.refresh();
        }
    }

    const totalPipeline = stages.reduce((sum, s) => sum + s.deals.reduce((dSum, d) => dSum + d.value, 0), 0);
    const totalDeals = stages.reduce((sum, s) => sum + s.deals.length, 0);
    const wonCount = closedDeals.filter(d => d.status === 'WON').length;
    const wonValue = closedDeals.filter(d => d.status === 'WON').reduce((sum, d) => sum + d.value, 0);
    const lostCount = closedDeals.filter(d => d.status === 'LOST').length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B]">Pipeline de Ventas</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-[14px] text-[#71717A]">{totalDeals} abiertos</span>
                        <span className="text-[14px] font-semibold text-[#10B981]">{formatCOP(totalPipeline)} en pipeline</span>
                        {wonCount > 0 && <span className="text-[14px] text-[#10B981]">✓ {wonCount} ganados ({formatCOP(wonValue)})</span>}
                        {lostCount > 0 && <span className="text-[14px] text-[#EF4444]">✗ {lostCount} perdidos</span>}
                    </div>
                </div>
            </div>

            {/* Kanban board */}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages.map(stage => (
                        <StageColumn key={stage.id} stage={stage} contacts={contacts} agents={agents} />
                    ))}
                </div>

                <DragOverlay>
                    {activeDeal && (
                        <div className="bg-white rounded-xl border-2 border-[#10B981] p-3.5 shadow-xl w-[280px] rotate-2">
                            <p className="text-[14px] font-semibold text-[#09090B]">{activeDeal.title}</p>
                            {activeDeal.value > 0 && (
                                <p className="text-[14px] font-bold text-[#10B981] mt-1">{formatCOP(activeDeal.value)}</p>
                            )}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Closed deals */}
            {closedDeals.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-[16px] font-semibold text-[#09090B]">Deals cerrados</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {/* Won */}
                        <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                            <div className="px-4 py-3 bg-[#ECFDF5] border-b border-[#D1FAE5] flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-[#10B981]" />
                                <span className="text-[14px] font-semibold text-[#065F46]">Ganados</span>
                                <span className="text-[13px] font-bold text-[#10B981] ml-auto">
                                    {formatCOP(closedDeals.filter(d => d.status === 'WON').reduce((sum, d) => sum + d.value, 0))}
                                </span>
                            </div>
                            <div className="divide-y divide-[#F4F4F5]">
                                {closedDeals.filter(d => d.status === 'WON').length === 0 ? (
                                    <p className="px-4 py-6 text-center text-[13px] text-[#A1A1AA]">Sin deals ganados aun</p>
                                ) : (
                                    closedDeals.filter(d => d.status === 'WON').map(deal => (
                                        <div key={deal.id} className="px-4 py-3 flex items-center justify-between group">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                                                    <span className="text-[14px] font-medium text-[#09090B]">{deal.title}</span>
                                                </div>
                                                <span className="text-[12px] text-[#71717A]">
                                                    {deal.contactName || 'Sin contacto'} · {new Date(deal.closedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-bold text-[#10B981]">{formatCOP(deal.value)}</span>
                                                <button
                                                    onClick={async () => { await reopenDeal(deal.id); router.refresh(); toast.success('Deal reabierto'); }}
                                                    className="opacity-0 group-hover:opacity-100 text-[11px] text-[#3B82F6] hover:underline transition-opacity"
                                                >
                                                    Reabrir
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Lost */}
                        <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                            <div className="px-4 py-3 bg-[#FEF2F2] border-b border-[#FECACA] flex items-center gap-2">
                                <Ban className="h-4 w-4 text-[#EF4444]" />
                                <span className="text-[14px] font-semibold text-[#991B1B]">Perdidos</span>
                                <span className="text-[13px] text-[#EF4444] ml-auto">
                                    {closedDeals.filter(d => d.status === 'LOST').length} deals
                                </span>
                            </div>
                            <div className="divide-y divide-[#F4F4F5]">
                                {closedDeals.filter(d => d.status === 'LOST').length === 0 ? (
                                    <p className="px-4 py-6 text-center text-[13px] text-[#A1A1AA]">Sin deals perdidos</p>
                                ) : (
                                    closedDeals.filter(d => d.status === 'LOST').map(deal => (
                                        <div key={deal.id} className="px-4 py-3 flex items-center justify-between group">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />
                                                    <span className="text-[14px] font-medium text-[#09090B]">{deal.title}</span>
                                                </div>
                                                <span className="text-[12px] text-[#71717A]">
                                                    {deal.contactName || 'Sin contacto'} · {new Date(deal.closedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {deal.value > 0 && <span className="text-[13px] text-[#A1A1AA] line-through">{formatCOP(deal.value)}</span>}
                                                <button
                                                    onClick={async () => { await reopenDeal(deal.id); router.refresh(); toast.success('Deal reabierto'); }}
                                                    className="opacity-0 group-hover:opacity-100 text-[11px] text-[#3B82F6] hover:underline transition-opacity"
                                                >
                                                    Reabrir
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
