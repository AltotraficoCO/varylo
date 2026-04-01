'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#09090B', lineHeight: 1.2 }}>
              Difusiones
            </h1>
            <p style={{ fontSize: 14, color: '#71717A', marginTop: 4 }}>
              Envía plantillas de WhatsApp a listas de contactos
            </p>
            {tierLabel && (
              <div className="flex items-center gap-1.5 mt-2">
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
            <button
              onClick={() => setTab('lists')}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#3F3F46',
                border: '1px solid #E4E4E7',
                borderRadius: 8,
                padding: '8px 16px',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Listas
            </button>
            <button
              onClick={() => setTab('broadcasts')}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#3F3F46',
                border: '1px solid #E4E4E7',
                borderRadius: 8,
                padding: '8px 16px',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Historial
            </button>
            <button
              onClick={() => {
                if (tab === 'lists') {
                  setShowCreateList(true);
                } else {
                  setShowBroadcast(true);
                }
              }}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: '#10B981',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva difusión
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid #E4E4E7', width: '100%' }}>
        <div className="flex">
          <button
            onClick={() => setTab('lists')}
            style={{
              fontSize: 14,
              fontWeight: tab === 'lists' ? 600 : 400,
              color: tab === 'lists' ? '#09090B' : '#71717A',
              padding: '12px 16px',
              borderBottom: tab === 'lists' ? '2px solid #10B981' : '2px solid transparent',
              background: 'transparent',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: tab === 'lists' ? '#10B981' : 'transparent',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            Listas de contactos
          </button>
          <button
            onClick={() => setTab('broadcasts')}
            style={{
              fontSize: 14,
              fontWeight: tab === 'broadcasts' ? 600 : 400,
              color: tab === 'broadcasts' ? '#09090B' : '#71717A',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: tab === 'broadcasts' ? '#10B981' : 'transparent',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            Historial de envíos
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'lists' && (
        <>
          {contactLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto pt-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#09090B' }}>Sin listas de contactos</h2>
              <p style={{ fontSize: 14, color: '#71717A' }}>
                Crea tu primera lista para organizar contactos y enviar difusiones masivas.
              </p>
              <button
                onClick={() => setShowCreateList(true)}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  backgroundColor: '#10B981',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus className="h-4 w-4" />
                Crear primera lista
              </button>
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
              {/* Table header */}
              <div
                className="flex items-center"
                style={{ backgroundColor: '#F4F4F5', padding: '12px 16px' }}
              >
                <div className="flex-1" style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Nombre
                </div>
                <div style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Contactos
                </div>
                <div style={{ width: 160, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Creada
                </div>
                <div style={{ width: 160, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Acciones
                </div>
              </div>
              {/* Table rows */}
              {contactLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center"
                  style={{ padding: '14px 16px', borderTop: '1px solid #E4E4E7' }}
                >
                  <div className="flex-1" style={{ fontSize: 14, fontWeight: 500, color: '#09090B' }}>
                    {list.name}
                  </div>
                  <div style={{ width: 120, fontSize: 14, fontWeight: 400, color: '#3F3F46' }}>
                    {list._count.contacts}
                  </div>
                  <div style={{ width: 160, fontSize: 14, fontWeight: 400, color: '#71717A' }}>
                    {new Date(list.createdAt).toLocaleDateString('es-CO')}
                  </div>
                  <div style={{ width: 160, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => setEditListId(list.id)}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#10B981',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setBroadcastListId(list.id);
                        setShowBroadcast(true);
                      }}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#10B981',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Enviar
                    </button>
                    <button
                      onClick={() => setDeleteListId(list.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#71717A',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'broadcasts' && (
        <>
          {broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto pt-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <Megaphone className="h-8 w-8 text-gray-400" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#09090B' }}>Sin difusiones</h2>
              <p style={{ fontSize: 14, color: '#71717A' }}>
                {contactLists.length === 0
                  ? 'Primero crea una lista de contactos, luego podrás enviar difusiones.'
                  : 'Envía tu primera difusión masiva a una lista de contactos.'}
              </p>
              {contactLists.length > 0 && (
                <button
                  onClick={() => setShowBroadcast(true)}
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#10B981',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Megaphone className="h-4 w-4" />
                  Crear difusión
                </button>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid #E4E4E7', overflow: 'hidden' }}>
              {/* Table header */}
              <div
                className="flex items-center"
                style={{ backgroundColor: '#F4F4F5', padding: '12px 16px' }}
              >
                <div className="flex-1" style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Plantilla
                </div>
                <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Lista
                </div>
                <div style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Estado
                </div>
                <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: '#71717A', textAlign: 'center' }}>
                  Enviados
                </div>
                <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#71717A', textAlign: 'center' }}>
                  Fallidos
                </div>
                <div style={{ width: 120, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Creada por
                </div>
                <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: '#71717A' }}>
                  Fecha
                </div>
              </div>
              {/* Table rows */}
              {broadcasts.map((b) => {
                const status = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={b.id}
                    className="flex items-center"
                    style={{ padding: '14px 16px', borderTop: '1px solid #E4E4E7' }}
                  >
                    <div className="flex-1" style={{ fontSize: 14, fontWeight: 500, color: '#09090B' }}>
                      {b.templateName}
                    </div>
                    <div style={{ width: 140, fontSize: 14, fontWeight: 400, color: '#3F3F46' }}>
                      {b.contactList.name}
                    </div>
                    <div style={{ width: 120 }}>
                      <Badge
                        variant="outline"
                        className={cn('text-xs flex items-center gap-1 w-fit', status.color)}
                      >
                        <StatusIcon className={cn('h-3 w-3', b.status === 'IN_PROGRESS' && 'animate-spin')} />
                        {status.label}
                      </Badge>
                    </div>
                    <div style={{ width: 100, fontSize: 14, fontWeight: 400, color: '#16a34a', textAlign: 'center', fontFamily: 'monospace' }}>
                      {b.sentCount}/{b.totalContacts}
                    </div>
                    <div style={{ width: 80, fontSize: 14, fontWeight: 400, color: '#ef4444', textAlign: 'center', fontFamily: 'monospace' }}>
                      {b.failedCount}
                    </div>
                    <div style={{ width: 120, fontSize: 14, fontWeight: 400, color: '#71717A' }}>
                      {b.createdBy?.name || '—'}
                    </div>
                    <div style={{ width: 140, fontSize: 14, fontWeight: 400, color: '#71717A' }}>
                      {new Date(b.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

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
