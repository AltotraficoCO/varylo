'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, X, CalendarPlus } from 'lucide-react';

type CalEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    attendees?: string[];
};

export function CalendarClient({ isConnected }: { isConnected: boolean }) {
    const [events, setEvents] = useState<CalEvent[]>([]);
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

    async function fetchEvents(start: string, end: string) {
        setLoading(true);
        const result = await getCalendarEvents(start, end);
        if (result.success) {
            setEvents(result.events as CalEvent[]);
        } else {
            toast.error(result.error || 'Error al cargar eventos');
        }
        setLoading(false);
    }

    function handleDatesSet(info: any) {
        fetchEvents(info.startStr, info.endStr);
    }

    function handleDateClick(info: any) {
        setCreateData(prev => ({
            ...prev,
            date: info.dateStr.slice(0, 10),
            startTime: info.dateStr.includes('T') ? info.dateStr.slice(11, 16) : '09:00',
            endTime: info.dateStr.includes('T')
                ? `${String(parseInt(info.dateStr.slice(11, 13)) + 1).padStart(2, '0')}:00`
                : '10:00',
        }));
        setShowCreate(true);
    }

    async function handleEventDrop(info: any) {
        const result = await updateCalendarEvent(info.event.id, {
            start: info.event.startStr,
            end: info.event.endStr,
        });
        if (!result.success) {
            toast.error('Error al mover evento');
            info.revert();
        }
    }

    async function handleCreate() {
        if (!createData.title || !createData.date) {
            toast.error('Titulo y fecha son obligatorios');
            return;
        }
        setSaving(true);
        const start = `${createData.date}T${createData.startTime}:00`;
        const end = `${createData.date}T${createData.endTime}:00`;
        const result = await createCalendarEvent({
            title: createData.title,
            start,
            end,
            description: createData.description || undefined,
            attendeeEmail: createData.attendeeEmail || undefined,
        });
        if (result.success) {
            toast.success('Evento creado');
            setShowCreate(false);
            setCreateData({ title: '', date: '', startTime: '09:00', endTime: '10:00', description: '', attendeeEmail: '' });
            // Refresh events
            const api = calendarRef.current?.getApi();
            if (api) fetchEvents(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
        } else {
            toast.error(result.error || 'Error al crear evento');
        }
        setSaving(false);
    }

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-md text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                        <CalendarPlus className="h-8 w-8 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Google Calendar no conectado</h2>
                    <p className="text-muted-foreground">
                        Conecta Google Calendar desde Configuracion &gt; Integraciones para ver y crear eventos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#09090B]">Calendario</h1>
                    <p className="text-sm text-[#71717A] mt-1">Google Calendar sincronizado</p>
                </div>
                <Button onClick={() => {
                    setCreateData(prev => ({ ...prev, date: new Date().toISOString().slice(0, 10) }));
                    setShowCreate(true);
                }}>
                    <CalendarPlus className="h-4 w-4 mr-1.5" />
                    Nueva reunion
                </Button>
            </div>

            {/* Loading indicator */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-[#71717A]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando eventos...
                </div>
            )}

            {/* Calendar */}
            <div className="bg-white rounded-xl border border-[#E4E4E7] p-4">
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
                    datesSet={handleDatesSet}
                    height="auto"
                    contentHeight={700}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    eventColor="#3B82F6"
                    eventTextColor="#ffffff"
                    slotLabelFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }}
                />
            </div>

            {/* Create event modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl border shadow-lg w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Nueva reunion</h3>
                            <button onClick={() => setShowCreate(false)} className="text-[#A1A1AA] hover:text-[#09090B]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <Label>Titulo</Label>
                                <Input
                                    value={createData.title}
                                    onChange={e => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Reunion con cliente"
                                />
                            </div>
                            <div>
                                <Label>Fecha</Label>
                                <Input
                                    type="date"
                                    value={createData.date}
                                    onChange={e => setCreateData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Hora inicio</Label>
                                    <Input
                                        type="time"
                                        value={createData.startTime}
                                        onChange={e => setCreateData(prev => ({ ...prev, startTime: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Hora fin</Label>
                                    <Input
                                        type="time"
                                        value={createData.endTime}
                                        onChange={e => setCreateData(prev => ({ ...prev, endTime: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Descripcion (opcional)</Label>
                                <Textarea
                                    value={createData.description}
                                    onChange={e => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Detalles de la reunion..."
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label>Email invitado (opcional)</Label>
                                <Input
                                    type="email"
                                    value={createData.attendeeEmail}
                                    onChange={e => setCreateData(prev => ({ ...prev, attendeeEmail: e.target.value }))}
                                    placeholder="cliente@email.com"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCreate(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                                Crear reunion
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
