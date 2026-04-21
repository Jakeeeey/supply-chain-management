"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ServerCrash, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function ServiceDownContent() {
    const searchParams = useSearchParams();
    const service = searchParams.get("service") || "Backend";

    return (
        <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-6 rounded-full bg-destructive/10">
                        <ServerCrash className="h-16 w-16 text-destructive animate-pulse" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase">Service Outage</h1>
                    <p className="text-muted-foreground font-medium">
                        We are currently experiencing technical difficulties with the <span className="text-foreground font-bold underline decoration-destructive/30">{service} Server</span>.
                    </p>
                </div>

                <div className="p-6 rounded-2xl border bg-card/50 backdrop-blur-sm text-sm text-muted-foreground leading-relaxed">
                    The authorization subsystem was unable to reach the upstream provider. 
                    Our technical team has been notified.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-semibold">
                        <Link href="/login">Sign In Again</Link>
                    </Button>
                    <Button 
                        onClick={() => window.location.href = "/main-dashboard"} 
                        className="rounded-xl h-12 px-8 font-semibold gap-2 active:scale-95 transition-transform"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>

                <div className="pt-8 opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-mono tracking-widest uppercase">VOS ERP • Error 503 Service Unavailable</p>
                </div>
            </div>
        </div>
    );
}

export default function ServiceDownPage() {
    return (
        <Suspense fallback={<div className="min-h-dvh flex items-center justify-center font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Error State...</div>}>
            <ServiceDownContent />
        </Suspense>
    );
}
