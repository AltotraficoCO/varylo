'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, FileText, Trash2, Send, Check, Eye } from 'lucide-react';
import { createQuote, updateQuoteStatus, deleteQuote } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDictionary } from '@/lib/i18n-context';

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

const STATUS_CONFIG_STATIC: Record<string, { labelKey: string; color: string; bg: string }> = {
    DRAFT: { labelKey: 'quoteDraft', color: '#71717A', bg: '#F4F4F5' },
    SENT: { labelKey: 'quoteSent', color: '#3B82F6', bg: '#EFF6FF' },
    VIEWED: { labelKey: 'quoteViewed', color: '#F59E0B', bg: '#FFFBEB' },
    ACCEPTED: { labelKey: 'quoteAccepted', color: '#10B981', bg: '#ECFDF5' },
    REJECTED: { labelKey: 'quoteRejected', color: '#EF4444', bg: '#FEF2F2' },
    EXPIRED: { labelKey: 'quoteExpired', color: '#A1A1AA', bg: '#F4F4F5' },
};

type QuoteItem = { id: string; name: string; quantity: number; unitPrice: number; total: number };
type Quote = {
    id: string;
    number: string;
    status: string;
    total: number;
    contact: { name: string | null; phone: string } | null;
    deal: { title: string } | null;
    items: QuoteItem[];
    createdBy: { name: string | null } | null;
    createdAt: string;
};

type ProductOption = { id: string; name: string; price: number };

export function QuotesClient({ quotes, products }: { quotes: Quote[]; products: ProductOption[] }) {
    const dict = useDictionary();
    const crm = dict.crm || {};
    const ui = dict.ui || {};
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<{ productId: string; name: string; quantity: number; unitPrice: number }[]>([]);
    const [notes, setNotes] = useState('');
    const router = useRouter();

    function addItem() {
        setItems([...items, { productId: '', name: '', quantity: 1, unitPrice: 0 }]);
    }

    function updateItem(idx: number, field: string, value: any) {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            // Auto-fill from product
            if (field === 'productId' && value) {
                const p = products.find(pr => pr.id === value);
                if (p) { updated.name = p.name; updated.unitPrice = p.price; }
            }
            return updated;
        }));
    }

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    async function handleCreate() {
        if (items.length === 0) { toast.error(crm.addAtLeastOneItem); return; }
        if (items.some(i => !i.name.trim())) { toast.error(crm.allItemsNeedName); return; }
        setSaving(true);
        await createQuote({
            notes: notes.trim() || undefined,
            items: items.map(i => ({ productId: i.productId || undefined, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
        });
        toast.success(ui.createdSuccessfully);
        setItems([]);
        setNotes('');
        setShowCreate(false);
        setSaving(false);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B]">{crm.quotes}</h1>
                    <p className="text-[14px] text-[#71717A] mt-0.5">{quotes.length} {crm.quotes?.toLowerCase()}</p>
                </div>
                <Button onClick={() => { setShowCreate(true); if (items.length === 0) addItem(); }} className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium">
                    <Plus className="h-4 w-4 mr-1.5" /> {crm.createQuote}
                </Button>
            </div>

            {/* Quotes table */}
            <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
                {/* Header */}
                <div className="flex items-center py-3 px-5 bg-[#FAFAFA] border-b border-[#E4E4E7] text-[12px] font-semibold text-[#71717A] uppercase tracking-wider">
                    <div className="w-[100px]">#</div>
                    <div className="w-[100px]">{ui.status}</div>
                    <div className="flex-1">{crm.contact}</div>
                    <div className="w-[120px]">Items</div>
                    <div className="w-[140px] text-right">{crm.total || ui.total}</div>
                    <div className="w-[120px] text-right">{ui.date}</div>
                    <div className="w-[80px]" />
                </div>

                {quotes.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText className="h-10 w-10 text-[#A1A1AA] mx-auto mb-3" />
                        <p className="text-[#71717A]">{crm.noQuotes}</p>
                    </div>
                ) : (
                    quotes.map(quote => {
                        const statusDef = STATUS_CONFIG_STATIC[quote.status] || STATUS_CONFIG_STATIC.DRAFT;
                        const status = { ...statusDef, label: (crm as any)[statusDef.labelKey] };
                        return (
                            <div key={quote.id} className="flex items-center py-3.5 px-5 border-b border-[#F4F4F5] hover:bg-[#FAFAFA] transition-colors group">
                                <div className="w-[100px] text-[14px] font-semibold text-[#09090B]">{quote.number}</div>
                                <div className="w-[100px]">
                                    <span className="text-[12px] font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: status.bg, color: status.color }}>
                                        {status.label}
                                    </span>
                                </div>
                                <div className="flex-1 text-[14px] text-[#3F3F46]">
                                    {quote.contact?.name || quote.contact?.phone || '-'}
                                </div>
                                <div className="w-[120px] text-[14px] text-[#71717A]">{quote.items.length} item{quote.items.length !== 1 ? 's' : ''}</div>
                                <div className="w-[140px] text-right text-[15px] font-bold text-[#09090B]">{formatCOP(quote.total)}</div>
                                <div className="w-[120px] text-right text-[13px] text-[#A1A1AA]">
                                    {new Date(quote.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="w-[80px] flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {quote.status === 'DRAFT' && (
                                        <button onClick={async () => { await updateQuoteStatus(quote.id, 'SENT'); toast.success(ui.updatedSuccessfully); router.refresh(); }} className="h-7 w-7 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#3B82F6] hover:bg-[#EFF6FF]" title={crm.quoteSent}>
                                            <Send className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {quote.status === 'SENT' && (
                                        <button onClick={async () => { await updateQuoteStatus(quote.id, 'ACCEPTED'); toast.success(ui.updatedSuccessfully); router.refresh(); }} className="h-7 w-7 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#10B981] hover:bg-[#ECFDF5]" title={crm.quoteAccepted}>
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <button onClick={async () => { if (confirm(ui.areYouSure)) { await deleteQuote(quote.id); router.refresh(); } }} className="h-7 w-7 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#FEF2F2]">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5] sticky top-0 bg-white z-10">
                            <h3 className="text-[16px] font-semibold text-[#09090B]">{crm.createQuote}</h3>
                            <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5]">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Items */}
                            <div className="space-y-2">
                                <Label className="text-[13px] font-medium">Items</Label>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <select
                                            value={item.productId}
                                            onChange={e => updateItem(idx, 'productId', e.target.value)}
                                            className="flex-1 h-9 rounded-lg border border-[#E4E4E7] bg-white px-2 text-[13px]"
                                        >
                                            <option value="">{crm.manualProduct}</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCOP(p.price)}</option>)}
                                        </select>
                                        {!item.productId && (
                                            <Input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder={ui.name} className="w-32 h-9 text-[13px] rounded-lg" />
                                        )}
                                        <Input value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} type="number" min={1} className="w-16 h-9 text-[13px] rounded-lg text-center" />
                                        <Input value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} type="number" placeholder={ui.price} className="w-28 h-9 text-[13px] rounded-lg" />
                                        <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-[#A1A1AA] hover:text-[#EF4444] p-1">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={addItem} className="text-[13px] text-[#10B981] hover:underline flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> {crm.addItem}
                                </button>
                            </div>

                            {/* Subtotal */}
                            <div className="flex justify-end py-2 border-t border-[#F4F4F5]">
                                <span className="text-[16px] font-bold text-[#09090B]">{crm.total || ui.total}: {formatCOP(subtotal)}</span>
                            </div>

                            {/* Notes */}
                            <div>
                                <Label className="text-[13px]">{ui.notes} ({ui.optional})</Label>
                                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={crm.notesPlaceholder} className="h-10 rounded-lg text-[14px]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#F4F4F5] bg-[#FAFAFA]">
                            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg">{ui.cancel}</Button>
                            <Button onClick={handleCreate} disabled={saving} className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} {crm.createQuote}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
