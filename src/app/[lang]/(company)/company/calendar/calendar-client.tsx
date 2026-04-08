'use client';

import { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent } from './actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, Plus, CalendarDays, Clock, MapPin, User, ExternalLink, Video, Users } from 'lucide-react';
import './calendar.css';

type Attendee = { email: string; name: string; status: string };

type CalEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    attendees?: Attendee[];
    location?: string;
    htmlLink?: string;
    hangoutLink?: string;
    creator?: string;
    organizer?: string;
};

export function CalendarClient({ isConnected }: { isConnected: boolean }) {
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [createData, setCreateData] = useState({
        title: '',
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
        attendeeEmail: '',
    });
    const [saving, setSaving] = useState(false);
    const calendarRef = useRef<any>(null);

    const fetchEvents = useCallback(async (start: string, end: string) => {
        setLoading(true);
        const result = await getCalendarEvents(start, end);
        if (result.success) {
            setEvents(result.events as CalEvent[]);
        } else {
            toast.error(result.error || 'Error al cargar eventos');
        }
        setLoading(false);
    }, []);

    function handleDatesSet(info: any) {
        fetchEvents(info.startStr, info.endStr);
    }

    function handleDateClick(info: any) {
        setCreateData(prev => ({
            ...prev,
            title: '',
            description: '',
            attendeeEmail: '',
            date: info.dateStr.slice(0, 10),
            startTime: info.dateStr.includes('T') ? info.dateStr.slice(11, 16) : '09:00',
            endTime: info.dateStr.includes('T')
                ? `${String(Math.min(parseInt(info.dateStr.slice(11, 13)) + 1, 23)).padStart(2, '0')}:00`
                : '10:00',
        }));
        setShowCreate(true);
    }

    async function handleEventDrop(info: any) {
        const result = await updateCalendarEvent(info.event.id, {
            start: info.event.startStr,
            end: info.event.endStr,
        });
        if (result.success) {
            toast.success('Evento actualizado');
        } else {
            toast.error('Error al mover evento');
            info.revert();
        }
    }

    async function handleCreate() {
        if (!createData.title.trim() || !createData.date) {
            toast.error('Titulo y fecha son obligatorios');
            return;
        }
        setSaving(true);
        const start = `${createData.date}T${createData.startTime}:00`;
        const end = `${createData.date}T${createData.endTime}:00`;
        const result = await createCalendarEvent({
            title: createData.title.trim(),
            start,
            end,
            description: createData.description.trim() || undefined,
            attendeeEmail: createData.attendeeEmail.trim() || undefined,
        });
        if (result.success) {
            toast.success('Reunion creada exitosamente');
            setShowCreate(false);
            setCreateData({ title: '', date: '', startTime: '09:00', endTime: '10:00', description: '', attendeeEmail: '' });
            const api = calendarRef.current?.getApi();
            if (api) fetchEvents(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
        } else {
            toast.error(result.error || 'Error al crear evento');
        }
        setSaving(false);
    }

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-12">
                <div className="max-w-sm text-center space-y-5">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                        <CalendarDays className="h-10 w-10 text-[#3B82F6]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#09090B]">Google Calendar</h2>
                        <p className="text-[14px] text-[#71717A] mt-2 leading-relaxed">
                            Conecta tu cuenta de Google Calendar para ver y gestionar tus reuniones directamente desde Varylo.
                        </p>
                    </div>
                    <a
                        href="?tab=integrations"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#059669] transition-colors"
                    >
                        Conectar Google Calendar
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-[#3B82F6]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#09090B]">Calendario</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                            <span className="text-[13px] text-[#71717A]">Sincronizado con Google Calendar</span>
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-[#A1A1AA]" />}
                        </div>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setCreateData(prev => ({
                            ...prev,
                            title: '',
                            description: '',
                            attendeeEmail: '',
                            date: new Date().toISOString().slice(0, 10),
                            startTime: '09:00',
                            endTime: '10:00',
                        }));
                        setShowCreate(true);
                    }}
                    className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium px-4 py-2 text-[14px]"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nueva reunion
                </Button>
            </div>

            {/* Calendar container */}
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-5 shadow-sm varylo-calendar">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    buttonText={{
                        today: 'Hoy',
                        month: 'Mes',
                        week: 'Semana',
                        day: 'Dia',
                        list: 'Lista',
                    }}
                    locale="es"
                    timeZone="America/Bogota"
                    events={events}
                    editable={true}
                    selectable={true}
                    dateClick={handleDateClick}
                    eventDrop={handleEventDrop}
                    eventClick={(info) => {
                        info.jsEvent.preventDefault();
                        const found = events.find(e => e.id === info.event.id);
                        if (found) setSelectedEvent(found);
                    }}
                    datesSet={handleDatesSet}
                    height="auto"
                    contentHeight={680}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    dayMaxEvents={3}
                    slotLabelFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }}
                    eventTimeFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }}
                />
            </div>

            {/* Create event modal */}
            {showCreate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowCreate(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                                    <CalendarDays className="h-4.5 w-4.5 text-[#10B981]" />
                                </div>
                                <h3 className="text-[16px] font-semibold text-[#09090B]">Nueva reunion</h3>
                            </div>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="px-6 py-5 space-y-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">Titulo</Label>
                                <Input
                                    value={createData.title}
                                    onChange={e => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Reunion con cliente"
                                    className="h-10 rounded-lg border-[#E4E4E7] text-[14px] placeholder:text-[#A1A1AA] focus-visible:ring-[#10B981]"
                                    autoFocus
                                />
                            </div>

                            {/* Date */}
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46] flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                    Fecha
                                </Label>
                                <Input
                                    type="date"
                                    value={createData.date}
                                    onChange={e => setCreateData(prev => ({ ...prev, date: e.target.value }))}
                                    className="h-10 rounded-lg border-[#E4E4E7] text-[14px] focus-visible:ring-[#10B981]"
                                />
                            </div>

                            {/* Time range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-medium text-[#3F3F46] flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                        Inicio
                                    </Label>
                                    <Input
                                        type="time"
                                        value={createData.startTime}
                                        onChange={e => setCreateData(prev => ({ ...prev, startTime: e.target.value }))}
                                        className="h-10 rounded-lg border-[#E4E4E7] text-[14px] focus-visible:ring-[#10B981]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-medium text-[#3F3F46] flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                        Fin
                                    </Label>
                                    <Input
                                        type="time"
                                        value={createData.endTime}
                                        onChange={e => setCreateData(prev => ({ ...prev, endTime: e.target.value }))}
                                        className="h-10 rounded-lg border-[#E4E4E7] text-[14px] focus-visible:ring-[#10B981]"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46]">Descripcion <span className="text-[#A1A1AA] font-normal">(opcional)</span></Label>
                                <Textarea
                                    value={createData.description}
                                    onChange={e => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Detalles de la reunion..."
                                    rows={2}
                                    className="rounded-lg border-[#E4E4E7] text-[14px] placeholder:text-[#A1A1AA] resize-none focus-visible:ring-[#10B981]"
                                />
                            </div>

                            {/* Attendee */}
                            <div className="space-y-1.5">
                                <Label className="text-[13px] font-medium text-[#3F3F46] flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-[#A1A1AA]" />
                                    Invitado <span className="text-[#A1A1AA] font-normal">(opcional)</span>
                                </Label>
                                <Input
                                    type="email"
                                    value={createData.attendeeEmail}
                                    onChange={e => setCreateData(prev => ({ ...prev, attendeeEmail: e.target.value }))}
                                    placeholder="cliente@email.com"
                                    className="h-10 rounded-lg border-[#E4E4E7] text-[14px] placeholder:text-[#A1A1AA] focus-visible:ring-[#10B981]"
                                />
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#F4F4F5] bg-[#FAFAFA]">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreate(false)}
                                className="rounded-lg px-4 py-2 text-[14px] border-[#E4E4E7]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={saving}
                                className="rounded-lg px-5 py-2 text-[14px] bg-[#10B981] hover:bg-[#059669] text-white font-medium"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                                Crear reunion
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event detail modal */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header with colored bar */}
                        <div className="h-2 bg-gradient-to-r from-[#10B981] to-[#059669]" />
                        <div className="flex items-start justify-between px-6 pt-5 pb-0">
                            <h3 className="text-[18px] font-bold text-[#09090B] leading-tight pr-4">
                                {selectedEvent.title}
                            </h3>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Date & Time */}
                            <div className="flex items-start gap-3">
                                <CalendarDays className="h-4.5 w-4.5 text-[#71717A] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[14px] font-medium text-[#09090B]">
                                        {new Date(selectedEvent.start).toLocaleDateString('es-CO', {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-[13px] text-[#71717A]">
                                        {new Date(selectedEvent.start).toLocaleTimeString('es-CO', {
                                            hour: 'numeric', minute: '2-digit', hour12: true
                                        })}
                                        {' — '}
                                        {new Date(selectedEvent.end).toLocaleTimeString('es-CO', {
                                            hour: 'numeric', minute: '2-digit', hour12: true
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Google Meet link */}
                            {selectedEvent.hangoutLink && (
                                <div className="flex items-center gap-3">
                                    <Video className="h-4.5 w-4.5 text-[#71717A] shrink-0" />
                                    <a
                                        href={selectedEvent.hangoutLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[14px] text-[#3B82F6] hover:underline font-medium flex items-center gap-1"
                                    >
                                        Unirse a Google Meet
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}

                            {/* Location */}
                            {selectedEvent.location && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4.5 w-4.5 text-[#71717A] mt-0.5 shrink-0" />
                                    <p className="text-[14px] text-[#3F3F46]">{selectedEvent.location}</p>
                                </div>
                            )}

                            {/* Description */}
                            {selectedEvent.description && (
                                <div className="rounded-lg bg-[#FAFAFA] border border-[#F4F4F5] p-3">
                                    <p className="text-[13px] text-[#3F3F46] whitespace-pre-wrap leading-relaxed">
                                        {selectedEvent.description}
                                    </p>
                                </div>
                            )}

                            {/* Attendees */}
                            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[#71717A]" />
                                        <span className="text-[13px] font-medium text-[#71717A]">
                                            {selectedEvent.attendees.length} participante{selectedEvent.attendees.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 ml-6">
                                        {selectedEvent.attendees.map((a, i) => {
                                            const statusColor = a.status === 'accepted' ? '#10B981'
                                                : a.status === 'declined' ? '#EF4444'
                                                : a.status === 'tentative' ? '#F59E0B'
                                                : '#A1A1AA';
                                            const statusLabel = a.status === 'accepted' ? 'Aceptado'
                                                : a.status === 'declined' ? 'Rechazado'
                                                : a.status === 'tentative' ? 'Quizas'
                                                : 'Pendiente';
                                            return (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="h-7 w-7 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[11px] font-semibold text-[#71717A] shrink-0">
                                                            {(a.name || a.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-medium text-[#09090B] truncate">
                                                                {a.name || a.email}
                                                            </p>
                                                            {a.name && (
                                                                <p className="text-[11px] text-[#A1A1AA] truncate">{a.email}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                                                        <span className="text-[11px] text-[#71717A]">{statusLabel}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Organizer */}
                            {selectedEvent.organizer && (
                                <div className="flex items-center gap-3 pt-1">
                                    <User className="h-4 w-4 text-[#A1A1AA] shrink-0" />
                                    <p className="text-[12px] text-[#A1A1AA]">
                                        Organizado por {selectedEvent.organizer}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center px-6 py-4 border-t border-[#F4F4F5] bg-[#FAFAFA]">
                            {selectedEvent.htmlLink ? (
                                <a
                                    href={selectedEvent.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-[#3B82F6] hover:underline font-medium flex items-center gap-1"
                                >
                                    Abrir en Google Calendar
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : (
                                <div />
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedEvent(null)}
                                className="rounded-lg border-[#E4E4E7] text-[13px]"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
