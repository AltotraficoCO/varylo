'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsData } from './actions';
import { Loader2, Download } from 'lucide-react';
import { useDictionary } from '@/lib/i18n-context';

export default function AnalyticsPage() {
    const dict = useDictionary();
    const t = dict.dashboard?.analytics || {};
    const tc = dict.dashboard?.common || {};

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

    function downloadReport(d: any) {
        const lines: string[] = [];
        const locale = tc.locale || 'es-CO';
        const now = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

        lines.push(t.reportConvSummary || 'CONVERSATION SUMMARY');
        lines.push(t.reportMetricValue || 'Metric,Value');
        lines.push(`${tc.open || 'Open'},${d.summary.open}`);
        lines.push(`${tc.unattended || 'Unattended'},${d.summary.unattended}`);
        lines.push(`${tc.unassigned || 'Unassigned'},${d.summary.unassigned}`);
        lines.push(`${tc.pending || 'Pending'},${d.summary.pending}`);
        lines.push('');

        lines.push(t.reportAgentStatus || 'AGENT STATUS');
        lines.push(t.reportStatusQty || 'Status,Quantity');
        lines.push(`${tc.online || 'Online'},${d.agentStatus.online}`);
        lines.push(`${tc.busy || 'Busy'},${d.agentStatus.busy}`);
        lines.push(`${tc.offline || 'Offline'},${d.agentStatus.offline}`);
        lines.push('');

        if (d.aiMetrics && d.aiMetrics.totalInsights > 0) {
            lines.push(t.reportAiAnalysis || 'AI ANALYSIS');
            lines.push(t.reportMetricValue || 'Metric,Value');
            lines.push(`${t.totalAnalysis || 'Total analysis'},${d.aiMetrics.totalInsights}`);
            lines.push(`${t.avgToneFull || 'Average tone'},${d.aiMetrics.avgTone}`);
            lines.push(`${t.avgClarity || 'Average clarity'},${d.aiMetrics.avgClarity}`);
            lines.push(`${t.positive || 'Positive'},${d.aiMetrics.positive}`);
            lines.push(`${t.neutral || 'Neutral'},${d.aiMetrics.neutral}`);
            lines.push(`${t.negative || 'Negative'},${d.aiMetrics.negative}`);
            lines.push('');
        }

        lines.push(t.reportConvByAgent || 'CONVERSATIONS BY AGENT');
        lines.push(t.reportAgentHeaders || 'Agent,Email,Status,Open,Unattended');
        for (const agent of d.conversationsByAgent) {
            const status = agent.status === 'active' ? (tc.online || 'Online') : agent.status === 'busy' ? (tc.busy || 'Busy') : (tc.offline || 'Offline');
            lines.push(`"${agent.name}","${agent.email}",${status},${agent.openCount},${agent.unattendedCount}`);
        }
        lines.push('');

        const dayNames = t.dayNames || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        lines.push(t.reportTraffic || 'TRAFFIC BY HOUR (last 7 days)');
        lines.push('Day,' + Array.from({ length: 24 }, (_, i) => `${i}h`).join(','));
        for (let day = 0; day < 7; day++) {
            const row = [dayNames[day]];
            for (let h = 0; h < 24; h++) {
                row.push(String(d.heatmap[`${day}-${h}`] || 0));
            }
            lines.push(row.join(','));
        }

        const csv = '\uFEFF' + lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-varylo-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!data) return <div>{tc.errorLoading || 'Error loading data'}</div>;

    const dayNamesShort = t.dayNamesShort || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const msgWord = (count: number) => count !== 1 ? (t.messages || 'messages') : (t.message || 'message');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[24px] font-bold text-[#09090B]">{t.title || 'Analytics'}</h1>
                <p className="text-[14px] text-[#71717A] mt-1">{t.subtitle || 'Summary of your operation metrics'}</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">{tc.open || 'Open'}</span>
                    <span className="text-[28px] font-bold text-[#09090B] leading-none">{data.summary.open}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">{tc.unattended || 'Unattended'}</span>
                    <span className="text-[28px] font-bold text-[#EF4444] leading-none">{data.summary.unattended}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">{tc.unassigned || 'Unassigned'}</span>
                    <span className="text-[28px] font-bold text-[#F59E0B] leading-none">{data.summary.unassigned}</span>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-2">
                    <span className="text-[13px] text-[#71717A]">{tc.pending || 'Pending'}</span>
                    <span className="text-[28px] font-bold text-[#3B82F6] leading-none">{data.summary.pending}</span>
                </div>
            </div>

            {data.aiMetrics && data.aiMetrics.totalInsights > 0 && (
                <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base">✨</span>
                        <span className="text-[16px] font-semibold text-[#09090B]">{t.aiAnalysis || 'AI Analysis'}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">{t.avgTone || 'Avg. tone'}</span>
                            <span className="text-[20px] font-bold text-[#09090B] leading-none">{data.aiMetrics.avgTone}</span>
                            <div className="h-1.5 bg-[#F4F4F5] rounded-sm mt-1 overflow-hidden">
                                <div className="h-full rounded-sm bg-green-500" style={{ width: `${data.aiMetrics.avgTone}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">{t.clarity || 'Clarity'}</span>
                            <span className="text-[20px] font-bold text-[#09090B] leading-none">{data.aiMetrics.avgClarity}</span>
                            <div className="h-1.5 bg-[#F4F4F5] rounded-sm mt-1 overflow-hidden">
                                <div className="h-full rounded-sm bg-green-500" style={{ width: `${data.aiMetrics.avgClarity}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">{t.positive || 'Positive'}</span>
                            <span className="text-[20px] font-bold text-[#16A34A] leading-none">{data.aiMetrics.positive}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">{t.neutral || 'Neutral'}</span>
                            <span className="text-[20px] font-bold text-[#71717A] leading-none">{data.aiMetrics.neutral}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] text-[#71717A]">{t.negative || 'Negative'}</span>
                            <span className="text-[20px] font-bold text-[#EF4444] leading-none">{data.aiMetrics.negative}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl p-5 border border-[#E4E4E7] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-[16px] font-semibold text-[#09090B]">{t.conversationTraffic || 'Conversation Traffic'}</span>
                    <div className="flex gap-2">
                        {[
                            { label: t.days7 || '7 days', days: 7 },
                            { label: t.days14 || '14 days', days: 14 },
                            { label: t.days30 || '30 days', days: 30 },
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
                            {tc.downloadReport || 'Download report'}
                        </button>
                    </div>
                </div>
                <div
                    className={`relative flex gap-2 ${heatmapLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onMouseLeave={() => setTooltip(null)}
                >
                    {tooltip && (
                        <div
                            className="fixed z-50 px-2.5 py-1.5 rounded-md bg-[#09090B] text-white text-[11px] font-medium pointer-events-none shadow-lg"
                            style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
                        >
                            {tooltip.text}
                        </div>
                    )}
                    <div className="flex flex-col gap-[3px] pt-0 shrink-0">
                        {dayNamesShort.map((day: string) => (
                            <div key={day} className="h-[16px] flex items-center">
                                <span className="text-[10px] text-[#71717A] w-8 text-right">{day}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 flex flex-col gap-[3px]">
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
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
                                                text: `${dayNamesShort[dayIndex]} ${hourIndex}:00–${hourIndex + 1}:00 · ${count} ${msgWord(count)}`,
                                            })}
                                            onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    );
                                })}
                            </div>
                        ))}
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

            <div className="bg-white rounded-xl border border-[#E4E4E7] overflow-hidden">
                <div className="px-5 py-4">
                    <span className="text-[16px] font-semibold text-[#09090B]">{t.convByAgent || 'Conversations by agent'}</span>
                </div>
                <div className="flex items-center bg-[#F4F4F5] px-5 py-3">
                    <div className="flex-1 text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">Agent</div>
                    <div className="w-[120px] text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">{tc.open || 'Open'}</div>
                    <div className="w-[120px] text-[12px] font-semibold text-[#71717A] tracking-[0.3px]">{tc.unattended || 'Unattended'}</div>
                </div>
                {data.conversationsByAgent.length === 0 ? (
                    <div className="py-8 text-center text-[#71717A] text-sm">{t.noActiveAgents || 'No active agents'}</div>
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
