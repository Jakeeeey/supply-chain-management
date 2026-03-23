"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { toast } from "sonner"
import { Suspense } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

function normalizeLoginErrorMessage(rawMsg: string, httpStatus?: number) {
    const msg = String(rawMsg || "")
    const m = msg.toLowerCase()

    if (
        httpStatus === 401 ||
        m.includes("http 401") ||
        m.includes("unauthorized") ||
        m.includes("invalid credentials")
    ) {
        return "Credentials invalid."
    }

    if (
        m.includes("cannot reach spring api") ||
        m.includes("econnrefused") ||
        m.includes("fetch failed") ||
        m.includes("network error") ||
        m.includes("timeout") ||
        m.includes("aborted")
    ) {
        return "Server is down, please contact Administrator."
    }

    return msg
}

type FieldErrors = {
    email?: string
    hashPassword?: string
}

/**
 * 🚀 INNER COMPONENT
 * This contains all the logic that uses useSearchParams()
 */
function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [showPw, setShowPw] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const [email, setEmail] = React.useState("")
    const [hashPassword, setHashPassword] = React.useState("")
    const [remember, setRemember] = React.useState(false)

    const [errors, setErrors] = React.useState<FieldErrors>({})

    const validate = React.useCallback((): boolean => {
        const next: FieldErrors = {}
        if (!String(email).trim()) next.email = "Email is required"
        if (!String(hashPassword).trim()) next.hashPassword = "Password is required"
        setErrors(next)
        return Object.keys(next).length === 0
    }, [email, hashPassword])

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, hashPassword, remember }),
            })

            const data = await res.json().catch(() => null)

            if (!res.ok || !data?.ok) {
                const raw = String(data?.message ?? `Login failed (HTTP ${res.status}).`)
                const msg = normalizeLoginErrorMessage(raw, res.status)
                toast.error("Sign in failed", { description: msg })
                return
            }

            toast.success("Signed in", { description: "Welcome back." })

            const next = searchParams.get("next") || "/main-dashboard"
            router.replace(next)
            router.refresh()
        } catch (err: any) {
            const raw = err?.message ? String(err.message) : "Network error. Please try again."
            const msg = normalizeLoginErrorMessage(raw)
            toast.error("Sign in failed", { description: msg })
        } finally {
            setLoading(false)
        }
    }

    const emailHasError = Boolean(errors.email)
    const pwHasError = Boolean(errors.hashPassword)

    return (
        <div className="min-h-dvh bg-background">
            <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4">
                <div className="grid w-full gap-6 lg:grid-cols-2 lg:gap-10">
                    {/* Left: Brand / intro */}
                    <div className="hidden flex-col justify-center rounded-2xl border bg-card p-10 lg:flex">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">VOS ERP</div>
                            <Badge variant="secondary" className="text-[11px]">
                                vos-web-v2
                            </Badge>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="text-3xl font-semibold tracking-tight">Welcome back.</div>
                            <div className="text-sm text-muted-foreground">
                                Sign in to access your assigned systems: Supply Chain, Finance, HR, BI, and
                                Audit. Authentication is JWT-based and stored via secure HttpOnly cookies.
                            </div>
                        </div>
                        <Separator className="my-8" />
                        <div className="text-sm text-muted-foreground">
                            Tip: If you are redirected here, you are not authenticated yet.
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="flex items-center justify-center">
                        <Card className="w-full max-w-md">
                            <CardHeader className="space-y-1">
                                <CardTitle className="text-2xl">Sign in</CardTitle>
                                <CardDescription>Enter your credentials to continue.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="name@company.com"
                                                className={cn("pl-9", emailHasError && "border-destructive focus-visible:ring-destructive")}
                                                autoComplete="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value)
                                                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                                                }}
                                                disabled={loading}
                                            />
                                        </div>
                                        {emailHasError && <p className="text-xs text-destructive">{errors.email}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPw ? "text" : "password"}
                                                placeholder="••••••••"
                                                className={cn("pl-9 pr-10", pwHasError && "border-destructive focus-visible:ring-destructive")}
                                                autoComplete="current-password"
                                                value={hashPassword}
                                                onChange={(e) => {
                                                    setHashPassword(e.target.value)
                                                    if (errors.hashPassword) setErrors((p) => ({ ...p, hashPassword: undefined }))
                                                }}
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw((s) => !s)}
                                                className="absolute right-2 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                                                disabled={loading}
                                            >
                                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {pwHasError && <p className="text-xs text-destructive">{errors.hashPassword}</p>}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Checkbox
                                                id="remember"
                                                checked={remember}
                                                onCheckedChange={(v) => setRemember(Boolean(v))}
                                                disabled={loading}
                                            />
                                            Remember me
                                        </label>
                                        <Button variant="link" type="button" className="px-0 text-sm" disabled>
                                            Forgot password
                                        </Button>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? "Signing in..." : "Sign in"}
                                    </Button>

                                    <Separator />

                                    <div className="text-center text-xs text-muted-foreground">
                                        Go to{" "}
                                        <Link className="underline underline-offset-4 hover:text-foreground" href="/public">
                                            home
                                        </Link>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * 🚀 DEFAULT EXPORT
 * Wraps the form in Suspense to prevent build errors during static generation.
 */
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh flex items-center justify-center bg-background">
                <div className="text-center animate-pulse">
                    <div className="text-lg font-semibold">VOS ERP</div>
                    <div className="text-sm text-muted-foreground">Initializing secure session...</div>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
