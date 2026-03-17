'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Users,
  Send,
  Trash2,
  Megaphone,
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateListDialog } from './create-list-dialog';
import { SendBroadcastDialog } from './send-broadcast-dialog';
import { EditListDialog } from './edit-list-dialog';
import { deleteContactList } from './actions';

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  IN_PROGRESS: { label: 'Enviando...', icon: Loader2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  COMPLETED: { label: 'Completada', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  FAILED: { label: 'Fallida', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  CANCELLED: { label: 'Cancelada', icon: AlertCircle, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | Date;
  _count: { contacts: number };
}

interface Broadcast {
  id: string;
  templateName: string;
  templateBody: string | null;
  status: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  createdAt: string | Date;
  completedAt: string | Date | null;
  contactList: { name: string };
  createdBy: { name: string | null };
}

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  originChannel: string | null;
}

type Tab = 'lists' | 'broadcasts';

export function BroadcastsClient({
  contactLists,
  broadcasts,
  contacts,
  lang,
}: {
  contactLists: ContactList[];
  broadcasts: Broadcast[];
  contacts: Contact[];
  lang: string;
}) {
  const [tab, setTab] = useState<Tab>('lists');
  const [showCreateList, setShowCreateList] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [broadcastListId, setBroadcastListId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tier, setTier] = useState<{ messaging_limit_tier?: string; quality_rating?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/whatsapp-tier')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTier(data); })
      .catch(() => {});
  }, []);

  const tierLabel = tier?.messaging_limit_tier?.replace('TIER_', '')?.replace('K', 'K msgs/día') || null;
  const qualityColor = tier?.quality_rating === 'GREEN' ? 'text-green-600 bg-green-50 border-green-200'
    : tier?.quality_rating === 'YELLOW' ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
    : tier?.quality_rating === 'RED' ? 'text-red-600 bg-red-50 border-red-200' : '';

  const handleDeleteList = async () => {
    if (!deleteListId) return;
    setIsDeleting(true);
    const result = await deleteContactList(deleteListId);
    setIsDeleting(false);
    if (result.success) {
      toast.success('Lista eliminada');
      setDeleteListId(null);
      router.refresh();
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="h-14 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Difusiones</h1>
            {tierLabel && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn('text-[10px] px-2 h-5', qualityColor)}>
                  Tier: {tierLabel}
                </Badge>
                {tier?.quality_rating && (
                  <Badge variant="outline" className={cn('text-[10px] px-2 h-5', qualityColor)}>
                    Calidad: {tier.quality_rating}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === 'lists' && (
              <>
                {contactLists.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowBroadcast(true)} className="h-8 px-3 text-xs">
                    <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                    Enviar difusión
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowCreateList(true)} className="h-8 px-3 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nueva lista
                </Button>
              </>
            )}
            {tab === 'broadcasts' && contactLists.length > 0 && (
              <Button size="sm" onClick={() => setShowBroadcast(true)} className="h-8 px-3 text-xs">
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Nueva difusión
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-4">
          <button
            onClick={() => setTab('lists')}
            className={cn(
              'pb-3 border-b-2 px-1 transition-colors text-sm flex items-center gap-1.5',
              tab === 'lists'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ListChecks className="h-4 w-4" />
            Listas de contactos
            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-muted">
              {contactLists.length}
            </Badge>
          </button>
          <button
            onClick={() => setTab('broadcasts')}
            className={cn(
              'pb-3 border-b-2 px-1 transition-colors text-sm flex items-center gap-1.5',
              tab === 'broadcasts'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Megaphone className="h-4 w-4" />
            Historial de difusiones
            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-muted">
              {broadcasts.length}
            </Badge>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        {tab === 'lists' && (
          <>
            {contactLists.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto pt-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Sin listas de contactos</h2>
                <p className="text-muted-foreground">
                  Crea tu primera lista para organizar contactos y enviar difusiones masivas.
                </p>
                <Button onClick={() => setShowCreateList(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera lista
                </Button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-center">Contactos</TableHead>
                          <TableHead>Creada</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactLists.map((list) => (
                          <TableRow key={list.id}>
                            <TableCell className="font-medium">{list.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {list.description || '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">
                                {list._count.contacts}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(list.createdAt).toLocaleDateString('es-CO')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-primary hover:text-primary"
                                  onClick={() => {
                                    setBroadcastListId(list.id);
                                    setShowBroadcast(true);
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" />
                                  Enviar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditListId(list.id)}
                                  title="Ver / Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteListId(list.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {tab === 'broadcasts' && (
          <>
            {broadcasts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto pt-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <Megaphone className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Sin difusiones</h2>
                <p className="text-muted-foreground">
                  {contactLists.length === 0
                    ? 'Primero crea una lista de contactos, luego podrás enviar difusiones.'
                    : 'Envía tu primera difusión masiva a una lista de contactos.'}
                </p>
                {contactLists.length > 0 && (
                  <Button onClick={() => setShowBroadcast(true)}>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Crear difusión
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plantilla</TableHead>
                          <TableHead>Lista</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Enviados</TableHead>
                          <TableHead className="text-center">Fallidos</TableHead>
                          <TableHead>Creada por</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {broadcasts.map((b) => {
                          const status = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
                          const StatusIcon = status.icon;
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.templateName}</TableCell>
                              <TableCell className="text-sm">{b.contactList.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs flex items-center gap-1 w-fit', status.color)}
                                >
                                  <StatusIcon className={cn('h-3 w-3', b.status === 'IN_PROGRESS' && 'animate-spin')} />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm text-green-600">
                                {b.sentCount}/{b.totalContacts}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm text-red-500">
                                {b.failedCount}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {b.createdBy?.name || '—'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(b.createdAt).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <CreateListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        contacts={contacts}
      />

      <SendBroadcastDialog
        open={showBroadcast}
        onOpenChange={(open) => {
          setShowBroadcast(open);
          if (!open) setBroadcastListId(null);
        }}
        contactLists={contactLists}
        lang={lang}
        preselectedListId={broadcastListId}
      />

      <EditListDialog
        listId={editListId}
        onClose={() => setEditListId(null)}
        allContacts={contacts}
      />

      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la lista de contactos. Los contactos no serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
