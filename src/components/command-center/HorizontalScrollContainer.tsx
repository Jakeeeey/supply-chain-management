"use client"

import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Observer } from 'gsap/all'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, Observer, ScrollToPlugin)

const GRID_POSITIONS = [
    { x: 0, y: 0 },      // 1. HRM
    { x: -100, y: 0 },   // 2. FIN
    { x: -100, y: -100 },// 3. SCM
    { x: 0, y: -100 },   // 4. CRM
    { x: 0, y: -200 },   // 5. BI
    { x: -100, y: -200 },// 6. ARF
    { x: -100, y: -300 } // 7. Engineering
];

const GRID_CLASSES = [
    "lg:left-0 lg:top-0",
    "lg:left-[100vw] lg:top-0",
    "lg:left-[100vw] lg:top-[100vh]",
    "lg:left-0 lg:top-[100vh]",
    "lg:left-0 lg:top-[200vh]",
    "lg:left-[100vw] lg:top-[200vh]",
    "lg:left-[100vw] lg:top-[300vh]"
];

export function HorizontalScrollContainer({ 
    children, 
    onIndexChange,
    activePanel = 0
}: { 
    children: React.ReactNode, 
    onIndexChange?: (index: number) => void,
    activePanel?: number
}) {

    const containerRef = useRef<HTMLDivElement>(null)
    const scrollWrapperRef = useRef<HTMLDivElement>(null)
    const currentIndex = useRef(activePanel > 0 ? activePanel - 1 : 0)
    const isAnimating = useRef(false)
    const goToSectionRef = useRef<((index: number, skipNotify?: boolean) => void) | undefined>(undefined)

    useLayoutEffect(() => {
        const sections = gsap.utils.toArray('.horizontal-panel') as HTMLElement[]
        const amount = sections.length - 1

        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();

            mm.add("(min-width: 1024px)", () => {
                // Pinning the container
                const st = ScrollTrigger.create({
                    trigger: containerRef.current,
                    pin: true,
                    start: "top top",
                    end: () => "+=" + (window.innerWidth * 7),
                    scrub: false,
                })

                function goToSection(index: number, skipNotify = false) {
                    if (index < 0 || index > amount) return
                    if (isAnimating.current && index === currentIndex.current) return
                    
                    isAnimating.current = true
                    currentIndex.current = index

                    const tl = gsap.timeline({
                        onComplete: () => {
                            isAnimating.current = false
                        }
                    })

                    // Animate 2D camera track
                    const pos = GRID_POSITIONS[index] || { x: 0, y: 0 }
                    tl.to(scrollWrapperRef.current, {
                        xPercent: pos.x,
                        yPercent: pos.y,
                        duration: 0.9,
                        ease: "power3.inOut",
                        force3D: true,
                        overwrite: true
                    }, 0)

                    // Sync vertical scroll to exact GSAP pin boundaries
                    const scrollTarget = st.start + (index / amount) * (st.end - st.start)
                    
                    if (window.lenis) {
                        // @ts-expect-error - lenis is dynamically injected
                        window.lenis.scrollTo(scrollTarget, { duration: 0.8, lock: true })
                    } else {
                        tl.to(window, {
                            scrollTo: { y: scrollTarget, autoKill: false },
                            duration: 0.8,
                            ease: "power3.inOut"
                        }, 0)
                    }

                    if (!skipNotify && onIndexChange) {
                        onIndexChange(index + 1)
                    }
                }

                goToSectionRef.current = goToSection;

                // Set initial position without animating
                const initialIndex = currentIndex.current;
                if (initialIndex > 0) {
                     const pos = GRID_POSITIONS[initialIndex];
                     gsap.set(scrollWrapperRef.current, { xPercent: pos?.x || 0, yPercent: pos?.y || 0 });
                }

                // Observe wheel and touch events to trigger transitions
                const obs = Observer.create({
                    target: containerRef.current,
                    type: "wheel,touch,pointer",
                    onDown: () => {
                        if (!st.isActive) return
                        if (!isAnimating.current && currentIndex.current < amount) {
                            goToSection(currentIndex.current + 1)
                        }
                    },
                    onUp: () => {
                        if (!st.isActive) return
                        if (!isAnimating.current && currentIndex.current > 0) {
                            goToSection(currentIndex.current - 1)
                        }
                    },
                    tolerance: 20,
                    preventDefault: false
                })

                return () => {
                    obs.kill()
                    goToSectionRef.current = undefined;
                }
            });
        }, containerRef)

        return () => ctx.revert()
    }, [onIndexChange]) // Do NOT include activePanel to avoid re-pinning during scroll

    // Separate effect to handle external activePanel changes cleanly
    React.useEffect(() => {
        if (activePanel === 0 && currentIndex.current !== 0) {
            // Returning to hero: reset the internal index and fast-set coordinates
            // without using goToSection (since goToSection would pull scroll back down)
            currentIndex.current = 0;
            if (scrollWrapperRef.current) {
                gsap.set(scrollWrapperRef.current, { xPercent: 0, yPercent: 0, overwrite: true });
            }
        } else if (activePanel > 0) {
            const normalizedExternalIndex = activePanel - 1;
            if (goToSectionRef.current && (normalizedExternalIndex !== currentIndex.current || activePanel === 1)) {
                goToSectionRef.current(normalizedExternalIndex, true);
            }
        }
    }, [activePanel]);

    return (
        <section ref={containerRef} className="relative w-full lg:h-screen overflow-hidden lg:overflow-visible bg-slate-50 dark:bg-slate-950">
            {/* Background Blur Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[150px] pointer-events-none" />
            
            {/* Scrolling Track */}
            <div 
                ref={scrollWrapperRef} 
                className="flex flex-col lg:block h-full w-full lg:will-change-transform"
                style={{ backfaceVisibility: 'hidden' }}
            >
                {React.Children.map(children, (child, index) => {
                    const gridClass = GRID_CLASSES[index] || "lg:left-0 lg:top-0";
                    return React.isValidElement(child) ? React.cloneElement(child, {
                        // @ts-expect-error dynamic class injection
                        className: `${child.props.className || ''} lg:absolute ${gridClass}`
                    }) : child;
                })}
            </div>
        </section>
    )
}

export function HorizontalPanel({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`horizontal-panel relative w-full lg:w-screen min-h-screen lg:h-screen flex flex-col lg:flex-row items-center justify-center shrink-0 py-24 lg:py-0 ${className || ''}`}>
            {children}
        </div>
    )
}
