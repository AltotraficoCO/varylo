export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <div className="mb-8 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">V</div>
                <span className="text-2xl font-bold tracking-tight text-foreground">VARYLO</span>
            </div>
            {children}
        </div>
    );
}
