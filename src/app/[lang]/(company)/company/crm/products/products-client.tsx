'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, Loader2, X, Pencil, Trash2 } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, createCategory } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDictionary } from '@/lib/i18n-context';

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

type Product = {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    price: number;
    stock: number | null;
    imageUrl: string | null;
    active: boolean;
    category: { id: string; name: string } | null;
};

type Category = { id: string; name: string; _count: { products: number } };

export function ProductsClient({ products, categories }: { products: Product[]; categories: Category[] }) {
    const dict = useDictionary();
    const crm = dict.crm || {};
    const ui = dict.ui || {};
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', sku: '', price: '', stock: '', categoryId: '' });
    const router = useRouter();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    async function handleCreate() {
        if (!form.name.trim()) { toast.error(crm.nameRequired); return; }
        setSaving(true);
        await createProduct({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            sku: form.sku.trim() || undefined,
            price: parseFloat(form.price) || 0,
            stock: form.stock ? parseInt(form.stock) : undefined,
            categoryId: form.categoryId || undefined,
        });
        toast.success(ui.createdSuccessfully);
        setForm({ name: '', description: '', sku: '', price: '', stock: '', categoryId: '' });
        setShowCreate(false);
        setSaving(false);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B]">{crm.products}</h1>
                    <p className="text-[14px] text-[#71717A] mt-0.5">{products.length} {crm.products?.toLowerCase()}</p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium">
                    <Plus className="h-4 w-4 mr-1.5" /> {crm.addProduct}
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA]" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`${ui.search} ${crm.products?.toLowerCase()}...`}
                    className="pl-9 h-10 rounded-xl border-[#E4E4E7] text-[14px]"
                />
            </div>

            {/* Products grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl border border-[#E4E4E7] p-5 space-y-3 hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between">
                            <div className="h-12 w-12 rounded-xl bg-[#F4F4F5] flex items-center justify-center">
                                <Package className="h-6 w-6 text-[#71717A]" />
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={async () => { await updateProduct(product.id, { active: !product.active }); router.refresh(); }}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5]"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={async () => { if (confirm(crm.confirmDeleteProduct)) { await deleteProduct(product.id); router.refresh(); } }}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[15px] font-semibold text-[#09090B]">{product.name}</h3>
                                {!product.active && <Badge variant="outline" className="text-[10px]">{ui.inactive}</Badge>}
                            </div>
                            {product.description && (
                                <p className="text-[13px] text-[#71717A] mt-1 line-clamp-2">{product.description}</p>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[18px] font-bold text-[#10B981]">{formatCOP(product.price)}</span>
                            {product.stock !== null && (
                                <span className={`text-[12px] font-medium px-2 py-0.5 rounded-md ${product.stock > 0 ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                                    {product.stock > 0 ? `${product.stock} ${crm.inStock}` : crm.outOfStock}
                                </span>
                            )}
                        </div>
                        {product.sku && <p className="text-[11px] text-[#A1A1AA]">SKU: {product.sku}</p>}
                        {product.category && <span className="text-[11px] text-[#71717A] bg-[#F4F4F5] rounded-md px-2 py-0.5">{product.category.name}</span>}
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <Package className="h-10 w-10 text-[#A1A1AA] mx-auto mb-3" />
                    <p className="text-[#71717A]">{search ? (ui.noResults) : (crm.noProducts)}</p>
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5]">
                            <h3 className="text-[16px] font-semibold text-[#09090B]">{crm.addProduct}</h3>
                            <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5]">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div><Label className="text-[13px]">{ui.name}</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={crm.productName} className="h-10 rounded-lg text-[14px]" autoFocus /></div>
                            <div><Label className="text-[13px]">{crm.productPrice || ui.price} (COP)</Label><Input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} type="number" placeholder="50000" className="h-10 rounded-lg text-[14px]" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label className="text-[13px]">SKU</Label><Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="ABC-001" className="h-10 rounded-lg text-[14px]" /></div>
                                <div><Label className="text-[13px]">Stock</Label><Input value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} type="number" placeholder="100" className="h-10 rounded-lg text-[14px]" /></div>
                            </div>
                            <div><Label className="text-[13px]">{ui.description}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={ui.description} rows={2} className="rounded-lg text-[14px] resize-none" /></div>
                            {categories.length > 0 && (
                                <div>
                                    <Label className="text-[13px]">{crm.category}</Label>
                                    <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} className="w-full h-10 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[14px]">
                                        <option value="">{crm.noCategory}</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#F4F4F5] bg-[#FAFAFA]">
                            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg">{ui.cancel}</Button>
                            <Button onClick={handleCreate} disabled={saving} className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white">
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} {crm.addProduct}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
