// src/app/services/page.tsx
import Link from "next/link"
import { LayoutGrid, Brush, Shield, Workflow, ArrowRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function Page() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                    <Badge variant="secondary">Services</Badge>
                    <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                        What we can build for you
                    </h1>
                    <p className="max-w-2xl text-pretty text-muted-foreground">
                        A clean, corporate-friendly services page with shadcn/ui. Replace items with your real
                        offerings and scope.
                    </p>
                </div>

                <Button asChild className="cursor-pointer">
                    <Link href="/contact">
                        Request a quote <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <Separator className="my-10 md:my-12" />

            <div className="grid gap-6 md:grid-cols-2">
                {[
                    {
                        icon: LayoutGrid,
                        title: "Frontend Engineering",
                        desc: "Next.js App Router, shadcn/ui patterns, performance-friendly composition.",
                        bullets: ["Reusable UI primitives", "Responsive layouts", "Maintainable structure"],
                    },
                    {
                        icon: Brush,
                        title: "UI/UX Design System",
                        desc: "Design tokens, layouts, component standards, page templates.",
                        bullets: ["Consistent spacing/typography", "Accessible components", "Design handoff-ready"],
                    },
                    {
                        icon: Workflow,
                        title: "Module UI Integration",
                        desc: "Marketing site + ERP app shell can coexist cleanly.",
                        bullets: ["Public vs private routing", "Navigation strategy", "Shared styling rules"],
                    },
                    {
                        icon: Shield,
                        title: "Quality & Standards",
                        desc: "Guardrails for UX quality and code consistency across pages.",
                        bullets: ["Naming conventions", "Component contracts", "UI regression control"],
                    },
                ].map((s) => (
                    <Card key={s.title} className="shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                    <s.icon className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-base">{s.title}</CardTitle>
                            </div>
                            <CardDescription>{s.desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <ul className="list-disc space-y-1 pl-5">
                                {s.bullets.map((b) => (
                                    <li key={b}>{b}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator className="my-10 md:my-12" />

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Need something specific?</CardTitle>
                    <CardDescription>Tell us your target workflow and timeline.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        We can tailor the services to your VOS modules (FM/SCM/HR/etc.).
                    </div>
                    <div className="flex gap-3">
                        <Button asChild variant="outline" className="cursor-pointer">
                            <Link href="/about">About us</Link>
                        </Button>
                        <Button asChild className="cursor-pointer">
                            <Link href="/contact">Contact</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
