// src/app/page.tsx
import Link from "next/link"
import { ArrowRight, ShieldCheck, Layers, Zap, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Page() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            {/* Hero */}
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div className="space-y-5">
                    <Badge variant="secondary">VOS-WEB • Next.js + shadcn/ui</Badge>
                    <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                        A modern, clean corporate website shell for your ecosystem.
                    </h1>
                    <p className="text-pretty text-base text-muted-foreground md:text-lg">
                        Built with 100% shadcn/ui components. Fast to iterate, consistent UI patterns, and ready
                        to integrate with your existing login + modules.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button asChild className="cursor-pointer">
                            <Link href="/services">
                                Explore Services <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="cursor-pointer">
                            <Link href="/contact">Contact Us</Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="outline">Responsive</Badge>
                        <Badge variant="outline">Accessible</Badge>
                        <Badge variant="outline">Consistent UI</Badge>
                        <Badge variant="outline">Fast iteration</Badge>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>What you get</CardTitle>
                        <CardDescription>Homepage layout with reusable patterns.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { icon: ShieldCheck, title: "Design consistency", desc: "Shadcn patterns across pages." },
                            { icon: Layers, title: "Scalable sections", desc: "Cards, tabs, accordions, CTAs." },
                            { icon: Zap, title: "Performance-ready", desc: "Server components by default." },
                        ].map((f) => (
                            <div key={f.title} className="flex gap-3 rounded-lg border bg-card p-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                    <f.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{f.title}</div>
                                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-10 md:my-12" />

            {/* Proof / Tabs */}
            <div className="grid gap-6 md:grid-cols-2 md:items-start">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Why this layout works</CardTitle>
                        <CardDescription>Clean IA + strong hierarchy with shadcn components.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            "Single global header/footer for consistent navigation.",
                            "Reusable section patterns (cards, tabs, badges).",
                            "Simple marketing pages that won’t fight your app shell later.",
                        ].map((t) => (
                            <div key={t} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{t}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
                        <TabsTrigger value="standards" className="cursor-pointer">Standards</TabsTrigger>
                        <TabsTrigger value="next" className="cursor-pointer">Next</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>Overview</CardTitle>
                                <CardDescription>Minimal corporate pages with strong UX defaults.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Use this as the public-facing layer, while your authenticated dashboard remains
                                separate. The nav includes Login to route into your existing auth flow.
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="standards">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>Standards</CardTitle>
                                <CardDescription>Accessible, consistent, responsive.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Uses shadcn/ui components + Tailwind utilities for layout. Keeps UI consistent with
                                the rest of VOS Web V2.
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="next">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle>Next Steps</CardTitle>
                                <CardDescription>Easy extension points.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Add pricing, FAQs, blog, careers, or a lead-capture flow—without changing the
                                navigation structure.
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Separator className="my-10 md:my-12" />

            {/* CTA */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Ready to tailor it to your brand?</CardTitle>
                    <CardDescription>We can wire this to your actual company content next.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        Update copy, add logos, and align with your ERP’s look.
                    </div>
                    <div className="flex gap-3">
                        <Button asChild className="cursor-pointer">
                            <Link href="/about">Learn more</Link>
                        </Button>
                        <Button asChild variant="outline" className="cursor-pointer">
                            <Link href="/contact">Get in touch</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
