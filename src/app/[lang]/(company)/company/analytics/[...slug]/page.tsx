export default async function AnalyticsStubPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <h3 className="text-xl font-medium">Próximamente</h3>
            <p>Esta sección de analíticas está en desarrollo.</p>
        </div>
    );
}
