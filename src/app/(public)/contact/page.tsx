// src/app/contact/page.tsx
import { Mail, Phone, MapPin } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function Page() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="space-y-3">
                <Badge variant="secondary">Contact</Badge>
                <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                    Let’s talk about your requirements
                </h1>
                <p className="max-w-2xl text-pretty text-muted-foreground">
                    This is a clean contact page template. Wire the form to your API later (or Directus / Spring BFF).
                </p>
            </div>

            <Separator className="my-10 md:my-12" />

            <div className="grid gap-6 md:grid-cols-3 md:items-start">
                {/* Contact info */}
                <Card className="shadow-sm md:col-span-1">
                    <CardHeader>
                        <CardTitle>Contact info</CardTitle>
                        <CardDescription>Replace with your real details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <div className="flex gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                                <div className="font-medium text-foreground">support@vos-web.local</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Phone</div>
                                <div className="font-medium text-foreground">+63 900 000 0000</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Office</div>
                                <div className="font-medium text-foreground">Manila, Philippines</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form */}
                <Card className="shadow-sm md:col-span-2">
                    <CardHeader>
                        <CardTitle>Send a message</CardTitle>
                        <CardDescription>We’ll respond with next steps and a suggested scope.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input id="name" placeholder="Your name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" placeholder="you@company.com" type="email" />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input id="company" placeholder="Company / Org" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="Project inquiry" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                placeholder="Tell us what you're building and what you need..."
                                className="min-h-[140px]"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                This form is UI-only. Wire it to an API route when ready.
                            </div>
                            <Button className="cursor-pointer">Send message</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
