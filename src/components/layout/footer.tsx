import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function Footer() {
    return (
        <footer className="border-t bg-background">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">VOS-WEB</div>
                            <Badge variant="secondary">Public</Badge>
                        </div>
                        <div className="max-w-md text-sm text-muted-foreground">
                            A clean shadcn/ui-based corporate site shell for your VOS Web V2 ecosystem.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                        <Button asChild variant="ghost" className="justify-start cursor-pointer">
                            <Link href="/">Home</Link>
                        </Button>
                        <Button asChild variant="ghost" className="justify-start cursor-pointer">
                            <Link href="/about">About</Link>
                        </Button>
                        <Button asChild variant="ghost" className="justify-start cursor-pointer">
                            <Link href="/services">Services</Link>
                        </Button>
                        <Button asChild variant="ghost" className="justify-start cursor-pointer">
                            <Link href="/contact">Contact</Link>
                        </Button>
                    </div>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <div>© {new Date().getFullYear()} VOS-WEB. All rights reserved.</div>
                    <div>UI Kit: shadcn/ui • Tailwind • Radix</div>
                </div>
            </div>
        </footer>
    )
}
