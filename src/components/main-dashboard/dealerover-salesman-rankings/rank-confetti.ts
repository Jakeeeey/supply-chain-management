import confetti from "canvas-confetti";

/**
 * Rank-Themed Confetti Palettes & Physics Controller
 * 
 * - Rank 1: Royal Golden Supernova (Dual-wave Cannon, Stars + Radiant Coins)
 * - Rank 2: Cosmic Frost & Diamond Stardust (High-fountain Shimmer, Ice Blue + Platinum)
 * - Rank 3: Smoldering Forge Embers (Warm Copper + Molten Amber Sparks)
 */

interface TriggerOptions {
    targetElement?: HTMLElement | null;
}

// Low-overhead anti-spam cooldown tracker to protect low-end browser canvas threads
let lastTriggerTime = 0;
const COOLDOWN_MS = 350;

export function triggerRankConfetti(rank: 1 | 2 | 3, options?: TriggerOptions) {
    if (typeof window === "undefined") return;

    const now = performance.now();
    if (now - lastTriggerTime < COOLDOWN_MS) {
        return; // Prevents memory canvas leak and frame drops from rapid button mash
    }
    lastTriggerTime = now;

    // Calculate dynamic origin coordinates based on card position
    let originX = 0.5;
    let originY = 0.4;

    if (options?.targetElement) {
        const rect = options.targetElement.getBoundingClientRect();
        // Target approx center-horizontal of the card
        originX = (rect.left + rect.width / 2) / window.innerWidth;
        // Target approx top-third of the card where the trophy/medal graphic sits
        originY = (rect.top + rect.height * 0.35) / window.innerHeight;
        
        // Clamp to safe screen boundaries
        originX = Math.max(0.1, Math.min(0.9, originX));
        originY = Math.max(0.1, Math.min(0.85, originY));
    }

    if (rank === 1) {
        // 🥇 1st Place: Royal Golden Supernova (Double Wave)
        // Wave 1: Immediate spark burst
        confetti({
            particleCount: 40,
            spread: 60,
            origin: { x: originX, y: originY },
            colors: ["#FFD700", "#F59E0B", "#FBBF24", "#FFFFFF"],
            shapes: ["star", "circle"],
            scalar: 1.1,
            startVelocity: 42,
            gravity: 1.1,
            ticks: 240,
            zIndex: 99999,
        });

        // Wave 2: Glorious Golden Arc Rain Shower (delayed by 120ms)
        setTimeout(() => {
            confetti({
                particleCount: 75,
                spread: 110,
                origin: { x: originX, y: Math.max(0.08, originY - 0.05) },
                colors: ["#FFE066", "#F59E0B", "#FDE047", "#D97706", "#FFFBEB"],
                shapes: ["star", "circle"],
                scalar: 0.95,
                startVelocity: 35,
                gravity: 0.75,
                drift: 0.1,
                ticks: 320,
                zIndex: 99999,
            });
        }, 120);
        return;
    }

    if (rank === 2) {
        // 🥈 2nd Place: Cosmic Frost & Diamond Stardust
        confetti({
            particleCount: 55,
            angle: 90,
            spread: 75,
            origin: { x: originX, y: originY },
            colors: ["#94A3B8", "#E2E8F0", "#38BDF8", "#0284C7", "#FFFFFF"],
            shapes: ["circle", "square"],
            scalar: 0.9,
            startVelocity: 38,
            gravity: 0.9,
            ticks: 260,
            zIndex: 99999,
        });

        // Micro glint trail
        setTimeout(() => {
            confetti({
                particleCount: 25,
                angle: 90,
                spread: 45,
                origin: { x: originX, y: originY },
                colors: ["#38BDF8", "#BAE6FD", "#FFFFFF"],
                shapes: ["circle"],
                scalar: 0.7,
                startVelocity: 28,
                gravity: 0.8,
                ticks: 200,
                zIndex: 99999,
            });
        }, 80);
        return;
    }

    // 🥉 3rd Place: Smoldering Forge Embers
    confetti({
        particleCount: 45,
        angle: 90,
        spread: 60,
        origin: { x: originX, y: originY },
        colors: ["#EA580C", "#B45309", "#F59E0B", "#9A3412", "#FED7AA"],
        shapes: ["circle"],
        scalar: 0.85,
        startVelocity: 32,
        gravity: 1.15,
        ticks: 210,
        zIndex: 99999,
    });
}

/**
 * Sequential Celebration Cascade
 * Fires 1st Place champion first, then 2nd Place, then 3rd Place
 * with synchronized delays and targeted element origins if provided.
 */
export function triggerSequentialPodiumConfetti(targets?: {
    rank1El?: HTMLElement | null;
    rank2El?: HTMLElement | null;
    rank3El?: HTMLElement | null;
}) {
    if (typeof window === "undefined") return;

    // Reset cooldown so the entrance celebration is guaranteed to trigger
    lastTriggerTime = 0;

    // 1. 🥇 1st Place Champion: Grand explosive opening (0ms)
    triggerRankConfetti(1, { targetElement: targets?.rank1El });

    // 2. 🥈 2nd Place Silver: Frost stardust burst (280ms)
    setTimeout(() => {
        lastTriggerTime = 0;
        triggerRankConfetti(2, { targetElement: targets?.rank2El });
    }, 280);

    // 3. 🥉 3rd Place Bronze: Amber forge sparks (540ms)
    setTimeout(() => {
        lastTriggerTime = 0;
        triggerRankConfetti(3, { targetElement: targets?.rank3El });
    }, 540);
}

