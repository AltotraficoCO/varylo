'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Loader2, Users, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createContactList } from './actions';

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  originChannel: string | null;
}

export function CreateListDialog({
  open,
  onOpenChange,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open]);

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  // Only show contacts with a real phone (not web_chat visitors)
  const whatsappContacts = filtered.filter(c => c.phone && !c.phone.startsWith('web_'));

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === whatsappContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(whatsappContacts.map((c) => c.id)));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un contacto.');
      return;
    }

    setSaving(true);
    const result = await createContactList({
      name: name.trim(),
      description: description.trim() || undefined,
      contactIds: Array.from(selectedIds),
    });
    setSaving(false);

    if (result.success) {
      toast.success(`Lista "${name}" creada con ${selectedIds.size} contactos.`);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Error al crear la lista.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva lista de contactos</DialogTitle>
          <DialogDescription>
            Crea una lista con nombre y selecciona los contactos que quieres incluir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Nombre de la lista *</Label>
              <Input
                placeholder="Ej: Clientes VIP, Prospectos..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Descripción (opcional)</Label>
              <Input
                placeholder="Describe el propósito de esta lista..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Contact selector */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm flex items-center gap-2">
                Contactos
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                  {selectedIds.size} seleccionados
                </Badge>
              </Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                {selectedIds.size === whatsappContacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contacto..."
                className="pl-9 h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-48 border rounded-md">
              {whatsappContacts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  No hay contactos con número de teléfono.
                </p>
              ) : (
                whatsappContacts.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm',
                      selectedIds.has(c.id) && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleContact(c.id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.name || c.phone}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !name.trim() || selectedIds.size === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Creando...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-1" />
                Crear lista ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
