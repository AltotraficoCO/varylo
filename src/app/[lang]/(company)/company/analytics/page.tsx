'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsData } from './actions';
import { Loader2, Download } from 'lucide-react';

function downloadReport(data: any) {
    const lines: string[] = [];
    const now = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

    // Summary
    lines.push('RESUMEN DE CONVERSACIONES');
    lines.push('Métrica,Valor');
    lines.push(`Abiertas,${data.summary.open}`);
    lines.push(`Desatendidas,${data.summary.unattended}`);
    lines.push(`Sin asignar,${data.summary.unassigned}`);
    lines.push(`Pendientes,${data.summary.pending}`);
    lines.push('');

    // Agent status
    lines.push('ESTADO DE AGENTES');
    lines.push('Estado,Cantidad');
    lines.push(`En línea,${data.agentStatus.online}`);
    lines.push(`Ocupado,${data.agentStatus.busy}`);
    lines.push(`Fuera de línea,${data.agentStatus.offline}`);
    lines.push('');

    // AI metrics
    if (data.aiMetrics && data.aiMetrics.totalInsights > 0) {
        lines.push('ANÁLISIS IA');
        lines.push('Métrica,Valor');
        lines.push(`Total análisis,${data.aiMetrics.totalInsights}`);
        lines.push(`Tono promedio,${data.aiMetrics.avgTone}`);
        lines.push(`Claridad promedio,${data.aiMetrics.avgClarity}`);
        lines.push(`Positivo,${data.aiMetrics.positive}`);
        lines.push(`Neutral,${data.aiMetrics.neutral}`);
        lines.push(`Negativo,${data.aiMetrics.negative}`);
        lines.push('');
    }

    // Agents table
    lines.push('CONVERSACIONES POR AGENTE');
    lines.push('Agente,Email,Estado,Abiertas,Desatendidas');
    for (const agent of data.conversationsByAgent) {
        const status = agent.status === 'active' ? 'En línea' : agent.status === 'busy' ? 'Ocupado' : 'Fuera de línea';
        lines.push(`"${agent.name}","${agent.email}",${status},${agent.openCount},${agent.unattendedCount}`);
    }
    lines.push('');

    // Heatmap
    lines.push('TRÁFICO POR HORA (últimos 7 días)');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    lines.push('Día,' + Array.from({ length: 24 }, (_, i) => `${i}h`).join(','));
    for (let d = 0; d < 7; d++) {
        const row = [dayNames[d]];
        for (let h = 0; h < 24; h++) {
            row.push(String(data.heatmap[`${d}-${h}`] || 0));
        }
        lines.push(row.join(','));
    }

    const csv = '\uFEFF' + lines.join('\n'); // BOM for Excel compatibility
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-varylo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [heatmapDays, setHeatmapDays] = useState(7);
    const [heatmapLoading, setHeatmapLoading] = useState(false);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await getAnalyticsData(7);
                setData(result);
            } catch (error) {
                console.error("Failed to load analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const changeHeatmapPeriod = async (days: number) => {
        setHeatmapDays(days);
        setHeatmapLoading(true);
        try {
            const result = await getAnalyticsData(days);
            if (result) setData(result);
        } finally {
            setHeatmapLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!data) return <div>Error al cargar los datos</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-[24px] font-bold text-[#09090B]">Analiticas</h1>
                <p className="text-[14px] text-[#71717A] mt-1">Resumen de metricas de tu operacion</p>
            </div>

            {/* Stats Row - 4 cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">Abiertas</span>
                    <span className="text-[28px] font-bold text-[#09090B] leading-none">{data.summary.open}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">Desatendidas</span>
                    <span className="text-[28px] font-bold text-[#EF4444] leading-none">{data.summary.unattended}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">Sin asignar</span>
                    <span className="text-[28px] font-bold text-[#F59E0B] leading-none">{data.summary.unassigned}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">Pendientes</span>
                    <span className="text-[28px] font-bold text-[#3B82F6] leading-none">{data.summary.pending}</span>
                </div>
            </div>

            {/* Analisis IA */}
            {data.aiMetrics && data.aiMetrics.totalInsights > 0 && (
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base">✨</span>
                        <span className="text-[16px] font-semibold text-[#09090B]">Analisis IA</span>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        {/* Tono prom. */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">Tono prom.</span>
                            <span className="text-[20px] font-bold text-[#09090B] leading-none">{data.aiMetrics.avgTone}</span>
                            <div className="h-1.5 bg-[#F4F4F5] rounded-sm mt-1 overflow-hidden">
                                <div
                                    className="h-full rounded-sm bg-green-500"
                                    style={{ width: `${data.aiMetrics.avgTone}%` }}
                                />
                            </div>
                        </div>
                        {/* Claridad */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">Claridad</span>
                            <span className="text-[20px] font-bold text-[#09090B] leading-none">{data.aiMetrics.avgClarity}</span>
                            <div className="h-1.5 bg-[#F4F4F5] rounded-sm mt-1 overflow-hidden">
                                <div
                                    className="h-full rounded-sm bg-green-500"
                                    style={{ width: `${data.aiMetrics.avgClarity}%` }}
                                />
                            </div>
                        </div>
                        {/* Positivo */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">Positivo</span>
                            <span className="text-[20px] font-bold text-[#16A34A] leading-none">{data.aiMetrics.positive}</span>
                        </div>
                        {/* Neutral */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">Neutral</span>
                            <span className="text-[20px] font-bold text-[#71717A] leading-none">{data.aiMetrics.neutral}</span>
                        </div>
                        {/* Negativo */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">Negativo</span>
                            <span className="text-[20px] font-bold text-[#EF4444] leading-none">{data.aiMetrics.negative}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Trafico de Conversacion */}
            <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-[16px] font-semibold text-[#09090B]">Trafico de Conversacion</span>
                    <div className="flex gap-2">
                        {[
                            { label: '7 días', days: 7 },
                            { label: '14 días', days: 14 },
                            { label: '30 días', days: 30 },
                        ].map((opt) => (
                            <button
                                key={opt.days}
                                onClick={() => changeHeatmapPeriod(opt.days)}
                                className={`rounded-lg px-3.5 py-2 text-[13px] transition-colors ${
                                    heatmapDays === opt.days
                                        ? 'bg-[#10B981] text-white'
                                        : 'bg-[#F4F4F5] text-[#09090B] hover:bg-[#E4E4E7]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            className="border border-[#E4E4E7] rounded-lg px-3.5 py-2 text-[13px] text-[#09090B] flex items-center gap-1.5 bg-white hover:bg-[#F4F4F5]"
                            onClick={() => downloadReport(data)}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Descargar reporte
                        </button>
                    </div>
                </div>
                <div
                    className={`relative flex gap-2 ${heatmapLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onMouseLeave={() => setTooltip(null)}
                >
                    {/* Tooltip */}
                    {tooltip && (
                        <div
                            className="fixed z-50 px-2.5 py-1.5 rounded-md bg-[#09090B] text-white text-[11px] font-medium pointer-events-none shadow-lg"
                            style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
                        >
                            {tooltip.text}
                        </div>
                    )}
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] pt-0 shrink-0">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                            <div key={day} className="h-[16px] flex items-center">
                                <span className="text-[10px] text-[#71717A] w-8 text-right">{day}</span>
                            </div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div className="flex-1 flex flex-col gap-[3px]">
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                            const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
                            return (
                            <div key={dayIndex} className="flex gap-[3px]">
                                {Array.from({ length: 24 }).map((_, hourIndex) => {
                                    const count = data.heatmap[`${dayIndex}-${hourIndex}`] || 0;
                                    const maxCount = Math.max(1, ...Object.values(data.heatmap as Record<string, number>));
                                    const intensity = count / maxCount;
                                    return (
                                        <div
                                            key={hourIndex}
                                            className="flex-1 h-[16px] rounded-[2px] cursor-pointer transition-transform hover:scale-125"
                                            style={{
                                                backgroundColor: count > 0
                                                    ? `rgba(16, 185, 129, ${0.15 + intensity * 0.85})`
                                                    : '#F4F4F5',
                                            }}
                                            onMouseEnter={(e) => setTooltip({
                                                x: e.clientX,
                                                y: e.clientY,
                                                text: `${dayNames[dayIndex]} ${hourIndex}:00–${hourIndex + 1}:00 · ${count} mensaje${count !== 1 ? 's' : ''}`,
                                            })}
                                            onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    );
                                })}
                            </div>
                            );
                        })}
                        {/* Hour labels */}
                        <div className="flex gap-[3px] mt-1">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="flex-1 text-center">
                                    {i % 3 === 0 && <span className="text-[9px] text-[#A1A1AA]">{i}h</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversaciones por agente */}
            <div className="bg-white rounded-xl border border-[#E4E4E7] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4">
                    <span className="text-[16px] font-semibold text-[#09090B]">Conversaciones por agente</span>
                </div>
                {/* Table header */}
                <div className="flex items-center bg-[#F4F4F5] px-5 py-3">
                    <div className="flex-1 text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">Agente</div>
                    <div className="w-[120px] text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">Abiertas</div>
                    <div className="w-[120px] text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">Desatendidas</div>
                </div>
                {/* Rows */}
                {data.conversationsByAgent.length === 0 ? (
                    <div className="py-8 text-center text-[#71717A] text-sm">No hay agentes activos</div>
                ) : (
                    data.conversationsByAgent.map((agent: any) => (
                        <div key={agent.id} className="flex items-center px-5 py-3.5 border-t border-[#F4F4F5]">
                            <div className="flex-1 flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[12px] font-medium text-[#71717A] shrink-0">
                                    {agent.avatar}
                                </div>
                                <span className="text-[14px] font-medium text-[#09090B]">{agent.name}</span>
                            </div>
                            <div className="w-[120px] text-[14px] font-medium text-[#09090B]">{agent.openCount}</div>
                            <div className={`w-[120px] text-[14px] font-medium ${agent.unattendedCount > 0 ? 'text-[#EF4444]' : 'text-[#09090B]'}`}>
                                {agent.unattendedCount}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
