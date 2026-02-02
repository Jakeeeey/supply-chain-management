// src/app/(public)/layout.tsx
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <Header />
            <main className="min-h-[calc(100dvh-64px)]">{children}</main>
            <Footer />
        </div>
    )
}
