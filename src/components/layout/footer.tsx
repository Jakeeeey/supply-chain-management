import Link from "next/link"
import Image from "next/image"
import vosLogo from "@/components/command-center/assets/vos.png"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Github, Twitter, Linkedin, Mail, Globe } from "lucide-react"

export function Footer() {
    return (
        <footer className="relative border-t border-slate-900/5 dark:border-white/5 bg-slate-50 dark:bg-slate-950 pt-24 pb-12 overflow-hidden">
            {/* Background Glows */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/5 blur-[150px] pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-7xl px-8">
                <div className="grid grid-cols-1 gap-16 md:grid-cols-4">
                    {/* Brand Section */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="relative h-14 w-14 rounded-2xl bg-slate-900/[0.02] dark:bg-white/[0.02] border border-slate-900/5 dark:border-white/5 flex items-center justify-center overflow-hidden">
                                <Image src={vosLogo} alt="VOS" fill className="object-contain p-3 dark:invert-0 invert" />
                            </div>
                            <div className="text-3xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">
                                VOS-<span className="text-cyan-600 dark:text-cyan-500">WEB</span>
                            </div>
                        </div>
                        <p className="max-w-md text-base font-medium text-slate-600 dark:text-white/40 leading-relaxed">
                            A high-density, mission-critical ERP ecosystem designed for precision and scale.
                            Built with modern architecture and premium aesthetics for global connectivity.
                        </p>
                        <div className="flex gap-3">
                            <Button size="icon" variant="outline" className="rounded-2xl h-12 w-12 border-slate-900/5 dark:border-white/5 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-600 dark:text-white/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/20 transition-all cursor-pointer">
                                <Github className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="outline" className="rounded-2xl h-12 w-12 border-slate-900/5 dark:border-white/5 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-600 dark:text-white/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/20 transition-all cursor-pointer">
                                <Twitter className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="outline" className="rounded-2xl h-12 w-12 border-slate-900/5 dark:border-white/5 bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-600 dark:text-white/50 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/20 transition-all cursor-pointer">
                                <Linkedin className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Links - Quick Access */}
                    <div className="space-y-8">
                        <h4 className="text-xs font-black tracking-widest uppercase text-cyan-500">Platform</h4>
                        <ul className="flex flex-col gap-4">
                            <li><Link href="/" className="text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link></li>
                            <li><Link href="/about" className="text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="/services" className="text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors">Services</Link></li>
                            <li><Link href="/contact" className="text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Links - Legal/Contact */}
                    <div className="space-y-8">
                        <h4 className="text-xs font-black tracking-widest uppercase text-cyan-500">Contact</h4>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer">
                                <Mail className="h-4 w-4 opacity-50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:opacity-100 transition-colors" />
                                <span>[EMAIL_ADDRESS]</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold tracking-tight text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer">
                                <Globe className="h-4 w-4 opacity-50 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:opacity-100 transition-colors" />
                                <span>vos-web.systems</span>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-16 bg-slate-900/5 dark:bg-white/5" />

                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs font-black tracking-widest text-slate-600/50 dark:text-white/30 uppercase">
                        © {new Date().getFullYear()} VOS-WEB CORE. All rights reserved.
                    </div>
                    <div className="flex items-center gap-8 text-[10px] font-black tracking-widest uppercase text-slate-600/50 dark:text-white/30">
                        <Link href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
                        <span className="hidden sm:inline-block text-cyan-600/80 dark:text-cyan-500/50 mix-blend-multiply dark:mix-blend-screen px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                            NODE: HQ-TEXAS-01
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
