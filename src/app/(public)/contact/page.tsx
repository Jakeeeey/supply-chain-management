"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
    Mail, 
    MapPin, 
    ArrowRight,
    Clock,
    ShieldCheck
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/command-center/GlassCard"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden selection:bg-cyan-500/30">
            {/* Background Auras */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 dark:bg-violet-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 pt-32 pb-24">
                {/* HERO */}
                <section className="px-6 mb-24">
                    <div className="max-w-7xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Badge variant="outline" className="px-4 py-1 rounded-full border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest text-[10px]">
                                CONNECT // VERTEX CORE
                            </Badge>
                        </motion.div>
                        
                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white">
                            Establish <br /><span className="text-cyan-600 dark:text-cyan-400">Integration</span>
                        </h1>
                        <p className="max-w-3xl mx-auto text-xl font-medium text-slate-600 dark:text-white/40 italic leading-relaxed">
                            We explore high-density solutions for LGUs and Enterprises. Connect with our engineering and project teams today.
                        </p>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
                     {/* CONTACT INFO & MISSION */}
                     <div className="lg:col-span-5 space-y-12">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">JOIN THE <span className="text-cyan-500">MISSION</span></h2>
                            <p className="text-slate-600 dark:text-white/50 leading-relaxed font-medium italic">
                                We are always looking for passionate individuals to help us build the next generation of LGU systems and enterprise SaaS. Let’s create something amazing together.
                            </p>
                        </motion.div>

                        <div className="space-y-4">
                            {[
                                { title: "Headquarters", icon: MapPin, 
                                  content: "Men2 Marketing, Gonzales St., Bonuan Boquig, Dagupan City, Pangasinan" },
                                { title: "Direct Support", icon: Mail, 
                                  content: "support@vertextechcorp.com", isBio: true },
                                { title: "Response Timeline", icon: Clock, 
                                  content: "Average initial response within 24 operational hours." }
                            ].map((item, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <GlassCard className="p-6 border-slate-200 dark:border-white/5 group transition-colors" accent="cyan">
                                        <div className="flex gap-6 items-start">
                                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                                <item.icon className="w-6 h-6 text-cyan-600 dark:text-cyan-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 italic">{item.title}</h4>
                                                <p className={cn(
                                                    "text-sm font-black italic uppercase leading-relaxed text-slate-900 dark:text-white",
                                                    item.isBio ? "text-lg text-cyan-600 dark:text-cyan-500" : ""
                                                )}>
                                                    {item.content}
                                                </p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-slate-200 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/30 italic">Secure & Confidential Inquiries</span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-white/20 font-medium leading-relaxed italic uppercase">
                                All information provided is protected by our strict privacy protocols. Data is used exclusively for project evaluation.
                            </p>
                        </div>
                     </div>

                     {/* CONTACT FORM */}
                     <div className="lg:col-span-7">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            <GlassCard className="p-10 md:p-12 border-slate-200 dark:border-white/10" accent="violet">
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">Send a Message</h3>
                                        <p className="text-sm font-medium text-slate-500 dark:text-white/30 italic">Describe your requirements and our project leaders will reach out.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ml-1 italic">Full Name</Label>
                                            <Input id="name" placeholder="John Doe" className="h-12 bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium text-slate-900 dark:text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ml-1 italic">Email / Point of Contact</Label>
                                            <Input id="email" type="email" placeholder="john@org.com" className="h-12 bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium text-slate-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ml-1 italic">Company / LGU</Label>
                                            <Input id="company" placeholder="Vertex Tech Corp" className="h-12 bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium text-slate-900 dark:text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ml-1 italic">Subject of Interest</Label>
                                            <Input id="subject" placeholder="ERP Implementation" className="h-12 bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium text-slate-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ml-1 italic">Project Brief / Message</Label>
                                        <Textarea id="message" placeholder="Describe what you're building..." className="min-h-[160px] bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-2xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium text-slate-900 dark:text-white leading-relaxed" />
                                    </div>

                                    <div className="pt-6">
                                        <Button className="w-full h-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] transition-transform active:scale-95 shadow-xl">
                                            TRANSMIT INQUIRY <ArrowRight className="ml-2 w-5 h-5 text-cyan-600" />
                                        </Button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                     </div>
                </div>
            </div>
        </div>
    )
}
