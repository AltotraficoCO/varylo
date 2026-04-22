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
import { Search, Loader2, Save, Phone, UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/lib/i18n-context';
import {
  getContactListWithContacts,
  updateContactList,
  addContactsToList,
  removeContactsFromList,
} from './actions';

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  originChannel: string | null;
}

export function EditListDialog({
  listId,
  onClose,
  allContacts,
}: {
  listId: string | null;
  onClose: () => void;
  allContacts: Contact[];
}) {
  const dict = useDictionary();
  const t = dict.broadcasts || {};
  const ui = dict.ui || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentContactIds, setCurrentContactIds] = useState<Set<string>>(new Set());
  const [originalContactIds, setOriginalContactIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!listId) return;

    setLoading(true);
    setSearch('');
    getContactListWithContacts(listId).then((list) => {
      if (list) {
        setName(list.name);
        setDescription(list.description || '');
        const ids = new Set(list.contacts.map((c: any) => c.id));
        setCurrentContactIds(ids);
        setOriginalContactIds(new Set(ids));
      }
      setLoading(false);
    });
  }, [listId]);

  const whatsappContacts = allContacts.filter((c) => {
    if (c.phone.startsWith('web_')) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  const toggleContact = (id: string) => {
    setCurrentContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!listId || !name.trim()) return;

    setSaving(true);

    // Update name/description
    await updateContactList(listId, {
      name: name.trim(),
      description: description.trim() || undefined,
    });

    // Calculate diffs
    const toAdd = [...currentContactIds].filter((id) => !originalContactIds.has(id));
    const toRemove = [...originalContactIds].filter((id) => !currentContactIds.has(id));

    if (toAdd.length > 0) {
      await addContactsToList(listId, toAdd);
    }
    if (toRemove.length > 0) {
      await removeContactsFromList(listId, toRemove);
    }

    setSaving(false);
    toast.success(ui.updatedSuccessfully || 'Lista actualizada');
    router.refresh();
    onClose();
  };

  const addedCount = [...currentContactIds].filter((id) => !originalContactIds.has(id)).length;
  const removedCount = [...originalContactIds].filter((id) => !currentContactIds.has(id)).length;

  return (
    <Dialog open={!!listId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.editList || 'Editar lista'}</DialogTitle>
          <DialogDescription>
            {t.noListsDesc || 'Modifica el nombre y los contactos de esta lista.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Name & Description */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{ui.name || 'Nombre'} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{ui.description || 'Descripción'}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  placeholder={ui.optional || 'Opcional'}
                />
              </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm flex items-center gap-2">
                  {dict.contacts?.title || 'Contactos'}
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                    {currentContactIds.size} en la lista
                  </Badge>
                  {addedCount > 0 && (
                    <Badge className="text-[10px] px-1.5 h-5 bg-green-100 text-green-700 border-green-200">
                      <UserPlus className="h-3 w-3 mr-0.5" />+{addedCount}
                    </Badge>
                  )}
                  {removedCount > 0 && (
                    <Badge className="text-[10px] px-1.5 h-5 bg-red-100 text-red-700 border-red-200">
                      <UserMinus className="h-3 w-3 mr-0.5" />-{removedCount}
                    </Badge>
                  )}
                </Label>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={dict.contacts?.search || 'Buscar contacto...'}
                  className="pl-9 h-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-52 border rounded-md">
                {whatsappContacts.map((c) => {
                  const inList = currentContactIds.has(c.id);
                  const wasInOriginal = originalContactIds.has(c.id);
                  const isAdded = inList && !wasInOriginal;
                  const isRemoved = !inList && wasInOriginal;

                  return (
                    <label
                      key={c.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors text-sm',
                        inList && 'bg-primary/5',
                        isAdded && 'bg-green-50',
                        isRemoved && 'bg-red-50/50'
                      )}
                    >
                      <Checkbox
                        checked={inList}
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
                      {isAdded && (
                        <Badge className="text-[9px] px-1 h-4 bg-green-100 text-green-700">nuevo</Badge>
                      )}
                      {isRemoved && (
                        <Badge className="text-[9px] px-1 h-4 bg-red-100 text-red-700">quitar</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {ui.cancel || 'Cancelar'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                {ui.saving || 'Guardando...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {ui.save || 'Guardar cambios'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
