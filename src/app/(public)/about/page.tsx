// src/app/about/page.tsx
import { Building2, Target, Users, Sparkles } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function Page() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="space-y-3">
                <Badge variant="secondary">About Us</Badge>
                <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                    Building reliable systems with clean UX and scalable frontends.
                </h1>
                <p className="max-w-3xl text-pretty text-muted-foreground">
                    This page is a polished corporate template using shadcn/ui components. Replace the copy
                    with your actual company story anytime.
                </p>
            </div>

            <Separator className="my-10 md:my-12" />

            <div className="grid gap-6 md:grid-cols-4">
                {[
                    { icon: Building2, title: "Who we are", desc: "Product-first builders for enterprise systems." },
                    { icon: Target, title: "Mission", desc: "Deliver consistent workflows and fast iterations." },
                    { icon: Users, title: "Team", desc: "UI/UX + engineering aligned to business outcomes." },
                    { icon: Sparkles, title: "Values", desc: "Clarity, quality, and long-term maintainability." },
                ].map((x) => (
                    <Card key={x.title} className="shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                    <x.icon className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-base">{x.title}</CardTitle>
                            </div>
                            <CardDescription>{x.desc}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <Separator className="my-10 md:my-12" />

            <div className="grid gap-6 md:grid-cols-2 md:items-start">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Our approach</CardTitle>
                        <CardDescription>Structured delivery with UI consistency.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            We design reusable components, keep spacing/typography consistent, and structure pages
                            for clarity. Public pages stay minimal, while authenticated areas can use a separate
                            app shell.
                        </p>
                        <p>
                            This keeps your marketing site fast and clean without interfering with your internal
                            ERP navigation patterns.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>FAQ</CardTitle>
                        <CardDescription>Common questions for stakeholders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="cursor-pointer">
                                    Can this match our ERP UI?
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground">
                                    Yes—same shadcn/ui design system, so it can align with your dashboard patterns.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-2">
                                <AccordionTrigger className="cursor-pointer">
                                    Is this optimized for Next.js App Router?
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground">
                                    Yes—pages are server components by default; navigation and header are client where
                                    needed.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-3">
                                <AccordionTrigger className="cursor-pointer">
                                    Can we add sections later (pricing, blog, careers)?
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground">
                                    Absolutely—this layout is intentionally modular to expand without redesigning the
                                    whole site.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
