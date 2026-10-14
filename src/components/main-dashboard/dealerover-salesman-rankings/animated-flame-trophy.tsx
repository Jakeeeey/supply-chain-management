"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface PodiumTrophyProps {
    rank: 1 | 2 | 3;
    className?: string;
}

/**
 * Game-Style Animated Podium Graphics
 * Rank 1: Gold Champion Trophy + Blazing Dual Flame + Rising Embers
 * Rank 2: Silver Elite Award Medal + V-Ribbon + Cosmic Frost Star Glints & Diamond Dust
 * Rank 3: Bronze Veteran Award Medal + V-Ribbon + Smoldering Forge Sparks & Warm Copper Glow
 */
export function AnimatedPodiumTrophy({ rank, className = "w-24 h-24" }: PodiumTrophyProps) {
    if (rank === 1) {
        return <GoldBlazingTrophy className={className} />;
    }
    if (rank === 2) {
        return <SilverAwardMedal className={className} />;
    }
    return <BronzeAwardMedal className={className} />;
}

// -------------------------------------------------------------
// 1ST PLACE: GOLD CHAMPION + BLAZING PHOENIX CUP (APPROACH 1)
// -------------------------------------------------------------
function GoldBlazingTrophy({ className }: { className: string }) {
    return (
        <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
            {/* Ambient Multi-Layer Heat Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-amber-500/40 via-orange-500/30 to-transparent blur-xl animate-pulse" />
            <div className="absolute -top-4 w-20 h-20 rounded-full bg-gradient-to-t from-orange-500/45 via-red-500/25 to-transparent blur-lg animate-ping opacity-65" />
            
            {/* White-Hot Core Torch Radiant Light */}
            <motion.div
                className="absolute top-0 w-10 h-10 rounded-full bg-amber-300/35 blur-md"
                animate={{
                    scale: [0.9, 1.25, 0.9],
                    opacity: [0.6, 0.95, 0.6]
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Rising Sparks and Embers Particles */}
            <motion.div
                className="absolute top-2 w-1.5 h-1.5 rounded-full bg-yellow-200 blur-[0.4px] shadow-[0_0_8px_#FDE047]"
                animate={{
                    y: [-4, -36],
                    x: [-3, 8],
                    opacity: [0, 1, 0],
                    scale: [0.6, 1.4, 0.3]
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-orange-400 blur-[0.4px] shadow-[0_0_8px_#F97316]"
                animate={{
                    y: [-2, -28],
                    x: [4, -6],
                    opacity: [0, 1, 0],
                    scale: [0.8, 1.5, 0.2]
                }}
                transition={{
                    duration: 1.3,
                    repeat: Infinity,
                    delay: 0.4,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-1 left-4 w-1 h-1 rounded-full bg-amber-300 blur-[0.3px]"
                animate={{
                    y: [-3, -32],
                    x: [-5, 5],
                    opacity: [0, 0.95, 0],
                    scale: [0.5, 1.3, 0.2]
                }}
                transition={{
                    duration: 1.9,
                    repeat: Infinity,
                    delay: 0.8,
                    ease: "easeOut"
                }}
            />

            {/* Levitating Sculpted Gold Trophy */}
            <motion.div
                className="w-full h-full relative flex items-center justify-center"
                animate={{
                    y: [-3, 3, -3],
                    rotate: [-0.8, 0.8, -0.8]
                }}
                transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full filter drop-shadow-[0_8px_20px_rgba(245,158,11,0.55)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Rich 3D Metallic Gold Gradients */}
                        <linearGradient id="goldChaliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFDF0" />
                            <stop offset="18%" stopColor="#FEF08A" />
                            <stop offset="45%" stopColor="#F59E0B" />
                            <stop offset="78%" stopColor="#D97706" />
                            <stop offset="100%" stopColor="#92400E" />
                        </linearGradient>

                        <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="40%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>

                        <linearGradient id="goldPedestalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#78350F" />
                            <stop offset="25%" stopColor="#F59E0B" />
                            <stop offset="50%" stopColor="#FEF08A" />
                            <stop offset="75%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#78350F" />
                        </linearGradient>

                        {/* Roaring Multi-Tier Flame Gradients */}
                        <linearGradient id="flameOuterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#991B1B" />
                            <stop offset="25%" stopColor="#DC2626" />
                            <stop offset="65%" stopColor="#EA580C" />
                            <stop offset="90%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#FEF08A" />
                        </linearGradient>

                        <linearGradient id="flameMidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#EA580C" />
                            <stop offset="45%" stopColor="#F59E0B" />
                            <stop offset="85%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#FFFFFF" />
                        </linearGradient>

                        <linearGradient id="flameCoreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="40%" stopColor="#FEF08A" />
                            <stop offset="100%" stopColor="#FFFFFF" />
                        </linearGradient>

                        {/* Specular Diagonal Sheen Sweep */}
                        <linearGradient id="goldSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.75" />
                            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                        </linearGradient>

                        <clipPath id="chaliceBodyClip">
                            <path d="M28 26 C28 26 29 60 50 60 C71 60 72 26 72 26 Z" />
                        </clipPath>
                    </defs>

                    {/* ========================================================= */}
                    {/* MULTI-TIER ORGANIC ROARING FLAMES (BEHIND & INSIDE CHALICE) */}
                    {/* ========================================================= */}
                    
                    {/* ========================================================= */}
                    {/* MULTI-TIER ORGANIC ROARING FLAMES (GPU-ACCELERATED)      */}
                    {/* ========================================================= */}
                    
                    {/* Flame Layer 1: Left Roaring Tongue */}
                    <motion.path
                        d="M45 28 C38 20 40 12 36 6 C42 12 48 18 46 28 Z"
                        fill="url(#flameOuterGrad)"
                        className="transform-gpu will-change-transform"
                        animate={{
                            scaleY: [1, 1.25, 0.9, 1.15, 1],
                            scaleX: [1, 0.88, 1.12, 0.95, 1],
                            rotate: [-2, 4, -3, 2, -2],
                            y: [0, -2, 1, -1, 0]
                        }}
                        transition={{
                            duration: 0.85,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ originX: "45px", originY: "28px" }}
                    />

                    {/* Flame Layer 1: Right Roaring Tongue */}
                    <motion.path
                        d="M55 28 C62 20 60 12 64 6 C58 12 52 18 54 28 Z"
                        fill="url(#flameOuterGrad)"
                        className="transform-gpu will-change-transform"
                        animate={{
                            scaleY: [1.1, 0.9, 1.28, 0.95, 1.1],
                            scaleX: [0.95, 1.12, 0.85, 1.05, 0.95],
                            rotate: [3, -3, 2, -4, 3],
                            y: [-1, 1, -2, 0, -1]
                        }}
                        transition={{
                            duration: 0.92,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ originX: "55px", originY: "28px" }}
                    />

                    {/* Flame Layer 2: Main Tall Central Roaring Blaze */}
                    <motion.path
                        d="M50 2 C40 12 44 20 38 28 C45 31 55 31 62 28 C56 20 60 12 50 2 Z"
                        fill="url(#flameMidGrad)"
                        className="transform-gpu will-change-transform"
                        animate={{
                            scaleY: [1, 1.18, 0.92, 1.12, 1],
                            scaleX: [1, 0.92, 1.08, 0.96, 1],
                            rotate: [-1, 1.5, -1, 2, -1],
                            y: [0, -3, 1, -2, 0]
                        }}
                        transition={{
                            duration: 0.75,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ originX: "50px", originY: "30px" }}
                    />

                    {/* Flame Layer 3: White-Hot Olympic Core */}
                    <motion.path
                        d="M50 10 C45 16 46 22 43 28 C47 30 53 30 57 28 C54 22 55 16 50 10 Z"
                        fill="url(#flameCoreGrad)"
                        className="transform-gpu will-change-transform"
                        animate={{
                            scaleY: [1.15, 0.88, 1.25, 0.92, 1.15],
                            scaleX: [0.9, 1.1, 0.85, 1.05, 0.9],
                            opacity: [0.9, 1, 0.85, 1, 0.9]
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ originX: "50px", originY: "28px" }}
                    />

                    {/* ========================================================= */}
                    {/* SCULPTED 3D GOLD TROPHY SILHOUETTE */}
                    {/* ========================================================= */}

                    {/* Base Pedestal (Layer 1 - Bottom Plinth) */}
                    <rect x="30" y="86" width="40" height="7" rx="2.5" fill="url(#goldPedestalGrad)" stroke="#78350F" strokeWidth="0.8" />
                    
                    {/* Base Pedestal (Layer 2 - Mid Step) */}
                    <rect x="35" y="80" width="30" height="6.5" rx="1.5" fill="url(#goldChaliceGrad)" stroke="#B45309" strokeWidth="0.6" />
                    
                    {/* Pedestal Riser Collar */}
                    <path d="M41 73 L59 73 L56 80 L44 80 Z" fill="url(#goldPedestalGrad)" />
                    
                    {/* Central Fluted Stem */}
                    <path d="M46 58 L54 58 L53 73 L47 73 Z" fill="url(#goldChaliceGrad)" />
                    <circle cx="50" cy="65" r="4.5" fill="url(#goldRimGrad)" stroke="#78350F" strokeWidth="0.6" />

                    {/* Sculpted Handles (Left & Right - Heavy Roman Double-Bevel) */}
                    <g filter="drop-shadow(0 2px 4px rgba(120,53,15,0.4))">
                        {/* Left Handle Outer */}
                        <path
                            d="M29 30 C17 30 16 48 30 54 C31 49 22 46 24 35 C25 33 27 33 29 33 Z"
                            fill="url(#goldChaliceGrad)"
                            stroke="#78350F"
                            strokeWidth="0.8"
                        />
                        {/* Right Handle Outer */}
                        <path
                            d="M71 30 C83 30 84 48 70 54 C69 49 78 46 76 35 C75 33 73 33 71 33 Z"
                            fill="url(#goldChaliceGrad)"
                            stroke="#78350F"
                            strokeWidth="0.8"
                        />
                    </g>

                    {/* Main Chalice Body */}
                    <path
                        d="M28 26 C28 26 29 60 50 60 C71 60 72 26 72 26 Z"
                        fill="url(#goldChaliceGrad)"
                        stroke="#78350F"
                        strokeWidth="0.9"
                    />

                    {/* Internal Chalice Lava Glow (Where flames emit) */}
                    <ellipse cx="50" cy="26" rx="22" ry="5.5" fill="#78350F" />
                    <ellipse cx="50" cy="26" rx="20" ry="4.5" fill="url(#flameOuterGrad)" />
                    <ellipse cx="50" cy="26" rx="14" ry="3" fill="url(#flameMidGrad)" />
                    <ellipse cx="50" cy="26" rx="8" ry="1.8" fill="#FFFFFF" />

                    {/* Chalice Upper Beveled Lip Rim */}
                    <path
                        d="M27 24 C27 22.5 37 21 50 21 C63 21 73 22.5 73 24 C73 25.5 63 27 50 27 C37 27 27 25.5 27 24 Z"
                        fill="url(#goldRimGrad)"
                        stroke="#B45309"
                        strokeWidth="0.7"
                    />

                    {/* Chalice Embossed Laurel Wreath & Star Insignia */}
                    <g opacity="0.95">
                        {/* Left Laurel Leaves */}
                        <path d="M42 39 C40 37 36 38 37 41 C38 43 41 42 42 39 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        <path d="M41 45 C38 44 35 46 37 49 C39 50 41 48 41 45 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        <path d="M44 51 C41 51 39 54 41 56 C43 57 45 54 44 51 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        
                        {/* Right Laurel Leaves */}
                        <path d="M58 39 C60 37 64 38 63 41 C62 43 59 42 58 39 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        <path d="M59 45 C62 44 65 46 63 49 C61 50 59 48 59 45 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        <path d="M56 51 C59 51 61 54 59 56 C57 57 55 54 56 51 Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.4" />
                        
                        {/* Laurel Stem Arc */}
                        <path d="M42 54 C46 57 54 57 58 54" stroke="#B45309" strokeWidth="1" strokeLinecap="round" fill="none" />

                        {/* Grand Champion Center Number '1' / Star Emblem */}
                        <circle cx="50" cy="43" r="7.5" fill="url(#goldRimGrad)" stroke="#78350F" strokeWidth="0.8" />
                        <text
                            x="50"
                            y="47"
                            textAnchor="middle"
                            fill="#78350F"
                            fontWeight="900"
                            fontSize="11"
                            fontFamily="sans-serif"
                            className="select-none"
                            style={{ fontStyle: "italic" }}
                        >
                            1
                        </text>
                    </g>

                    {/* Specular Diagonal Sheen Sweep on Chalice Body */}
                    <g clipPath="url(#chaliceBodyClip)">
                        <motion.rect
                            x="-40"
                            y="20"
                            width="25"
                            height="50"
                            fill="url(#goldSheenGrad)"
                            transform="rotate(-25 50 40)"
                            animate={{
                                x: [-50, 110]
                            }}
                            transition={{
                                duration: 3.5,
                                repeat: Infinity,
                                repeatDelay: 1.2,
                                ease: "easeInOut"
                            }}
                        />
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}

// -------------------------------------------------------------
// 2ND PLACE: SILVER ELITE AWARD MEDAL + V-RIBBON & FROST GLINTS
// -------------------------------------------------------------
// -------------------------------------------------------------
// 2ND PLACE: SILVER ELITE GRAND OLYMPIC MEDALLION (APPROACH 1)
// -------------------------------------------------------------
function SilverAwardMedal({ className }: { className: string }) {
    return (
        <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
            {/* Ambient Multi-Layer Cool Diamond Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-slate-400/25 via-cyan-400/20 to-transparent blur-xl animate-pulse" />
            <div className="absolute top-2 w-16 h-16 rounded-full bg-cyan-300/25 blur-lg animate-ping opacity-40" />

            {/* Orbiting Stardust Particles (Diamond Dust) */}
            <motion.div
                className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-cyan-200 blur-[0.3px] shadow-[0_0_6px_#38BDF8]"
                animate={{
                    y: [-2, -22],
                    x: [-2, 5],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.4, 0.2]
                }}
                transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-6 left-2 w-1.5 h-1.5 rounded-full bg-slate-100 blur-[0.3px] shadow-[0_0_6px_#FFFFFF]"
                animate={{
                    y: [-3, -26],
                    x: [3, -4],
                    opacity: [0, 0.9, 0],
                    scale: [0.6, 1.5, 0.3]
                }}
                transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    delay: 0.5,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-1 left-5 w-1 h-1 rounded-full bg-cyan-100 blur-[0.2px]"
                animate={{
                    y: [-1, -18],
                    x: [-3, 3],
                    opacity: [0, 0.8, 0],
                    scale: [0.4, 1.2, 0.2]
                }}
                transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: 0.9,
                    ease: "easeOut"
                }}
            />

            {/* Top-Right 4-Point Starburst Glint (Polished Diamond Shine) */}
            <motion.div
                className="absolute top-7 right-2.5 z-20"
                animate={{
                    scale: [0, 1.3, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 90, 180]
                }}
                transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    ease: "easeInOut"
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z"
                        fill="#FFFFFF"
                        className="filter drop-shadow-[0_0_6px_#38BDF8]"
                    />
                </svg>
            </motion.div>

            {/* Bottom-Left Secondary Micro Starburst Glint */}
            <motion.div
                className="absolute bottom-2 left-3 z-20"
                animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 0.9, 0],
                    rotate: [45, 135, 225]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: 1.1,
                    repeatDelay: 1,
                    ease: "easeInOut"
                }}
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
                        fill="#E0F2FE"
                        className="filter drop-shadow-[0_0_4px_#38BDF8]"
                    />
                </svg>
            </motion.div>

            {/* Pendulum Swing with Realistic Gravity & Floating Motion */}
            <motion.div
                className="w-full h-full relative flex items-center justify-center"
                style={{ originX: "50%", originY: "8%" }}
                animate={{
                    y: [-2.5, 2.5, -2.5],
                    rotate: [-1.8, 1.8, -1.8]
                }}
                transition={{
                    duration: 3.4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full filter drop-shadow-[0_8px_18px_rgba(148,163,184,0.5)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* High-Grade Bullion Platinum & Silver Gradients */}
                        <linearGradient id="silverOuterRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="20%" stopColor="#F1F5F9" />
                            <stop offset="45%" stopColor="#CBD5E1" />
                            <stop offset="70%" stopColor="#94A3B8" />
                            <stop offset="100%" stopColor="#475569" />
                        </linearGradient>

                        <linearGradient id="silverCoreDiscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="30%" stopColor="#E2E8F0" />
                            <stop offset="70%" stopColor="#94A3B8" />
                            <stop offset="100%" stopColor="#64748B" />
                        </linearGradient>

                        <linearGradient id="silverBevelCut" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="40%" stopColor="#64748B" />
                            <stop offset="70%" stopColor="#E2E8F0" />
                            <stop offset="100%" stopColor="#FFFFFF" />
                        </linearGradient>

                        {/* Sculpted Silk Ribbon with Shadows and Folds */}
                        <linearGradient id="cyanRibbonOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0369A1" />
                            <stop offset="40%" stopColor="#0284C7" />
                            <stop offset="75%" stopColor="#38BDF8" />
                            <stop offset="100%" stopColor="#075985" />
                        </linearGradient>

                        <linearGradient id="cyanRibbonStripe" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#E0F2FE" />
                            <stop offset="50%" stopColor="#BAE6FD" />
                            <stop offset="100%" stopColor="#7DD3FC" />
                        </linearGradient>

                        <linearGradient id="silverSheenLight" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.8" />
                            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                        </linearGradient>

                        <clipPath id="silverCoinBodyClip">
                            <circle cx="50" cy="67" r="24" />
                        </clipPath>
                    </defs>

                    {/* ========================================================= */}
                    {/* SCULPTED SILK V-RIBBONS (ROYAL COBALT + CYAN PINSTRIPES)  */}
                    {/* ========================================================= */}
                    
                    {/* Left Ribbon Main Drape */}
                    <path
                        d="M24 4 L48 46 L38 46 L14 8 Z"
                        fill="url(#cyanRibbonOuter)"
                        stroke="#075985"
                        strokeWidth="0.8"
                    />
                    {/* Left Ribbon Center Silk Pinstripe */}
                    <path
                        d="M21 5 L43 45 L40 45 L17 8 Z"
                        fill="url(#cyanRibbonStripe)"
                        opacity="0.85"
                    />

                    {/* Right Ribbon Main Drape (Overlapping Left) */}
                    <path
                        d="M76 4 L52 46 L62 46 L86 8 Z"
                        fill="url(#cyanRibbonOuter)"
                        stroke="#0369A1"
                        strokeWidth="0.8"
                    />
                    {/* Right Ribbon Center Silk Pinstripe */}
                    <path
                        d="M79 5 L57 45 L60 45 L83 8 Z"
                        fill="url(#cyanRibbonStripe)"
                        opacity="0.85"
                    />

                    {/* Heavy Metallic Ribbon Hanger Ring / Clasp */}
                    <rect x="42" y="42" width="16" height="5.5" rx="2" fill="url(#silverOuterRimGrad)" stroke="#475569" strokeWidth="0.8" />
                    <rect x="44.5" y="43.5" width="11" height="2.5" rx="1" fill="#1E293B" opacity="0.4" />

                    {/* ========================================================= */}
                    {/* 3D EMBOSSED SILVER OLYMPIC MEDALLION                     */}
                    {/* ========================================================= */}

                    {/* Outer Coin Base (Chamfer Edge) */}
                    <circle
                        cx="50"
                        cy="67"
                        r="25.5"
                        fill="url(#silverOuterRimGrad)"
                        stroke="#334155"
                        strokeWidth="1"
                    />

                    {/* Serrated Bullion Ridge Rim (Coin Milling / Dots Ring) */}
                    <circle
                        cx="50"
                        cy="67"
                        r="23"
                        stroke="#94A3B8"
                        strokeWidth="1.2"
                        strokeDasharray="1.5 2"
                        fill="none"
                        opacity="0.8"
                    />

                    {/* Deep Cut Chamfer Bevel Ring */}
                    <circle
                        cx="50"
                        cy="67"
                        r="21.5"
                        fill="url(#silverBevelCut)"
                        stroke="#475569"
                        strokeWidth="0.8"
                    />

                    {/* Recessed Medallion Disc Face */}
                    <circle
                        cx="50"
                        cy="67"
                        r="18.5"
                        fill="url(#silverCoreDiscGrad)"
                    />

                    {/* Inner Sunken Coin Shadow */}
                    <ellipse cx="50" cy="51" rx="15" ry="3.5" fill="#475569" opacity="0.35" />

                    {/* Embossed Sculpted Laurel Wreath on Lower Hemisphere */}
                    <g opacity="0.95">
                        {/* Left Laurel Branch */}
                        <path d="M37 63 C36 60 38 57 40 59 C41 61 39 63 37 63 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />
                        <path d="M36 69 C34 67 36 64 38 66 C39 68 37 70 36 69 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />
                        <path d="M39 74 C37 73 38 70 41 72 C42 74 40 76 39 74 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />
                        
                        {/* Right Laurel Branch */}
                        <path d="M63 63 C64 60 62 57 60 59 C59 61 61 63 63 63 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />
                        <path d="M64 69 C66 67 64 64 62 66 C61 68 63 70 64 69 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />
                        <path d="M61 74 C63 73 62 70 59 72 C58 74 60 76 61 74 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.4" />

                        {/* Ribbon Tie Knot at Bottom Center */}
                        <circle cx="50" cy="77" r="1.5" fill="#FFFFFF" stroke="#475569" strokeWidth="0.4" />
                    </g>

                    {/* 3D Sculpted Embossed Number '2' with Double-Drop Shadow */}
                    <g className="select-none">
                        {/* Shadow Extrusion */}
                        <path
                            d="M45.5 59.5 C45.5 55.5 48 53.5 51 53.5 C54 53.5 56.5 55.5 56.5 58.5 C56.5 61.2 54.5 63.8 51.5 66.2 L47.5 69.8 L57 69.8 L57 72.8 L44 72.8 L44 70.2 L49.5 65.5 C52 63.2 53.8 61.5 53.8 59 C53.8 57.2 52.5 56 51 56 C49.5 56 48.2 57.2 48.2 59 Z"
                            fill="#1E293B"
                            opacity="0.6"
                            transform="translate(0.6, 0.8)"
                        />
                        {/* Front Face of Number 2 */}
                        <path
                            d="M45.5 59.5 C45.5 55.5 48 53.5 51 53.5 C54 53.5 56.5 55.5 56.5 58.5 C56.5 61.2 54.5 63.8 51.5 66.2 L47.5 69.8 L57 69.8 L57 72.8 L44 72.8 L44 70.2 L49.5 65.5 C52 63.2 53.8 61.5 53.8 59 C53.8 57.2 52.5 56 51 56 C49.5 56 48.2 57.2 48.2 59 Z"
                            fill="url(#silverBevelCut)"
                            stroke="#334155"
                            strokeWidth="0.5"
                        />
                    </g>

                    {/* Specular Diagonal Sheen Sweep Across Coin */}
                    <g clipPath="url(#silverCoinBodyClip)">
                        <motion.rect
                            x="-20"
                            y="42"
                            width="16"
                            height="55"
                            fill="url(#silverSheenLight)"
                            transform="rotate(-25 50 67)"
                            animate={{
                                x: [-35, 115]
                            }}
                            transition={{
                                duration: 3.2,
                                repeat: Infinity,
                                repeatDelay: 1,
                                ease: "easeInOut"
                            }}
                        />
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}

// -------------------------------------------------------------
// 3RD PLACE: BRONZE VETERAN GRAND OLYMPIC MEDALLION (APPROACH 1)
// -------------------------------------------------------------
function BronzeAwardMedal({ className }: { className: string }) {
    return (
        <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
            {/* Ambient Multi-Layer Warm Copper Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-amber-950/30 via-orange-800/20 to-transparent blur-xl animate-pulse" />
            <div className="absolute top-2 w-16 h-16 rounded-full bg-orange-600/20 blur-lg opacity-50" />

            {/* Rising Smoldering Forge Embers */}
            <motion.div
                className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.3px] shadow-[0_0_6px_#F59E0B]"
                animate={{
                    y: [-2, -22],
                    x: [2, -4],
                    opacity: [0, 1, 0],
                    scale: [0.6, 1.4, 0.3]
                }}
                transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-6 left-2 w-1.5 h-1.5 rounded-full bg-orange-500 blur-[0.3px] shadow-[0_0_6px_#EA580C]"
                animate={{
                    y: [-3, -25],
                    x: [-2, 4],
                    opacity: [0, 0.9, 0],
                    scale: [0.7, 1.5, 0.3]
                }}
                transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    delay: 0.4,
                    ease: "easeOut"
                }}
            />
            <motion.div
                className="absolute top-1 left-5 w-1 h-1 rounded-full bg-amber-300 blur-[0.2px]"
                animate={{
                    y: [-1, -18],
                    x: [2, -3],
                    opacity: [0, 0.8, 0],
                    scale: [0.4, 1.2, 0.2]
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    delay: 0.8,
                    ease: "easeOut"
                }}
            />

            {/* Warm Copper 4-Point Glint on Medal Rim */}
            <motion.div
                className="absolute top-7 left-3 z-20"
                animate={{
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 90, 180]
                }}
                transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    repeatDelay: 0.7,
                    ease: "easeInOut"
                }}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z"
                        fill="#FEF3C7"
                        className="filter drop-shadow-[0_0_6px_#F59E0B]"
                    />
                </svg>
            </motion.div>

            {/* Pendulum Swing with Realistic Gravity & Floating Motion */}
            <motion.div
                className="w-full h-full relative flex items-center justify-center"
                style={{ originX: "50%", originY: "8%" }}
                animate={{
                    y: [-2.5, 2.5, -2.5],
                    rotate: [1.8, -1.8, 1.8]
                }}
                transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full filter drop-shadow-[0_8px_18px_rgba(180,83,9,0.5)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* High-Grade Antique Copper & Bronze Gradients */}
                        <linearGradient id="bronzeOuterRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FED7AA" />
                            <stop offset="25%" stopColor="#F59E0B" />
                            <stop offset="55%" stopColor="#D97706" />
                            <stop offset="80%" stopColor="#92400E" />
                            <stop offset="100%" stopColor="#451A03" />
                        </linearGradient>

                        <linearGradient id="bronzeCoreDiscGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFEDD5" />
                            <stop offset="30%" stopColor="#F59E0B" />
                            <stop offset="70%" stopColor="#B45309" />
                            <stop offset="100%" stopColor="#78350F" />
                        </linearGradient>

                        <linearGradient id="bronzeBevelCut" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#451A03" />
                            <stop offset="40%" stopColor="#78350F" />
                            <stop offset="70%" stopColor="#D97706" />
                            <stop offset="100%" stopColor="#FED7AA" />
                        </linearGradient>

                        {/* Crimson Silk V-Ribbon Gradients with Gold Stripe */}
                        <linearGradient id="crimsonRibbonOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#991B1B" />
                            <stop offset="40%" stopColor="#DC2626" />
                            <stop offset="75%" stopColor="#EF4444" />
                            <stop offset="100%" stopColor="#7F1D1D" />
                        </linearGradient>

                        <linearGradient id="crimsonRibbonStripe" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="50%" stopColor="#FBBF24" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>

                        <linearGradient id="bronzeSheenLight" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FED7AA" stopOpacity="0" />
                            <stop offset="45%" stopColor="#FFFBEB" stopOpacity="0.8" />
                            <stop offset="55%" stopColor="#FFFBEB" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#FED7AA" stopOpacity="0" />
                        </linearGradient>

                        <clipPath id="bronzeCoinBodyClip">
                            <circle cx="50" cy="67" r="24" />
                        </clipPath>
                    </defs>

                    {/* ========================================================= */}
                    {/* SCULPTED SILK V-RIBBONS (CRIMSON RED + GOLD STRIPES)      */}
                    {/* ========================================================= */}

                    {/* Left Ribbon Main Drape */}
                    <path
                        d="M24 4 L48 46 L38 46 L14 8 Z"
                        fill="url(#crimsonRibbonOuter)"
                        stroke="#7F1D1D"
                        strokeWidth="0.8"
                    />
                    {/* Left Ribbon Center Gold Pinstripe */}
                    <path
                        d="M21 5 L43 45 L40 45 L17 8 Z"
                        fill="url(#crimsonRibbonStripe)"
                        opacity="0.9"
                    />

                    {/* Right Ribbon Main Drape (Overlapping Left) */}
                    <path
                        d="M76 4 L52 46 L62 46 L86 8 Z"
                        fill="url(#crimsonRibbonOuter)"
                        stroke="#991B1B"
                        strokeWidth="0.8"
                    />
                    {/* Right Ribbon Center Gold Pinstripe */}
                    <path
                        d="M79 5 L57 45 L60 45 L83 8 Z"
                        fill="url(#crimsonRibbonStripe)"
                        opacity="0.9"
                    />

                    {/* Heavy Metallic Ribbon Hanger Ring / Clasp */}
                    <rect x="42" y="42" width="16" height="5.5" rx="2" fill="url(#bronzeOuterRimGrad)" stroke="#78350F" strokeWidth="0.8" />
                    <rect x="44.5" y="43.5" width="11" height="2.5" rx="1" fill="#451A03" opacity="0.4" />

                    {/* ========================================================= */}
                    {/* 3D EMBOSSED BRONZE OLYMPIC MEDALLION                     */}
                    {/* ========================================================= */}

                    {/* Outer Coin Base (Chamfer Edge) */}
                    <circle
                        cx="50"
                        cy="67"
                        r="25.5"
                        fill="url(#bronzeOuterRimGrad)"
                        stroke="#451A03"
                        strokeWidth="1"
                    />

                    {/* Serrated Bullion Ridge Rim (Coin Milling / Dots Ring) */}
                    <circle
                        cx="50"
                        cy="67"
                        r="23"
                        stroke="#D97706"
                        strokeWidth="1.2"
                        strokeDasharray="1.5 2"
                        fill="none"
                        opacity="0.8"
                    />

                    {/* Deep Cut Chamfer Bevel Ring */}
                    <circle
                        cx="50"
                        cy="67"
                        r="21.5"
                        fill="url(#bronzeBevelCut)"
                        stroke="#78350F"
                        strokeWidth="0.8"
                    />

                    {/* Recessed Medallion Disc Face */}
                    <circle
                        cx="50"
                        cy="67"
                        r="18.5"
                        fill="url(#bronzeCoreDiscGrad)"
                    />

                    {/* Inner Sunken Coin Shadow */}
                    <ellipse cx="50" cy="51" rx="15" ry="3.5" fill="#451A03" opacity="0.4" />

                    {/* Embossed Sculpted Laurel Wreath on Lower Hemisphere */}
                    <g opacity="0.95">
                        {/* Left Laurel Branch */}
                        <path d="M37 63 C36 60 38 57 40 59 C41 61 39 63 37 63 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                        <path d="M36 69 C34 67 36 64 38 66 C39 68 37 70 36 69 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                        <path d="M39 74 C37 73 38 70 41 72 C42 74 40 76 39 74 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                        
                        {/* Right Laurel Branch */}
                        <path d="M63 63 C64 60 62 57 60 59 C59 61 61 63 63 63 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                        <path d="M64 69 C66 67 64 64 62 66 C61 68 63 70 64 69 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                        <path d="M61 74 C63 73 62 70 59 72 C58 74 60 76 61 74 Z" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />

                        {/* Ribbon Tie Knot at Bottom Center */}
                        <circle cx="50" cy="77" r="1.5" fill="#FED7AA" stroke="#78350F" strokeWidth="0.4" />
                    </g>

                    {/* 3D Sculpted Embossed Number '3' with Double-Drop Shadow */}
                    <g className="select-none">
                        {/* Shadow Extrusion */}
                        <path
                            d="M45.5 56.5 C45.5 54.8 47.5 53.8 50.5 53.8 C54 53.8 56 55.5 56 57.5 C56 59.2 54.5 60.5 52.5 61.2 C55 61.8 56.8 63.5 56.8 66 C56.8 69 54 71 50.5 71 C47 71 44.8 69.5 44.5 67.5 L47.5 67.2 C47.7 68.2 49 68.8 50.5 68.8 C52.5 68.8 54 67.8 54 66 C54 64 52.5 63 50 63 L48 63 L48 61 L50 61 C52.2 61 53.5 60 53.5 58 C53.5 56.5 52.2 55.8 50.5 55.8 C48.8 55.8 47.8 56.5 47.6 57.2 Z"
                            fill="#2D1102"
                            opacity="0.6"
                            transform="translate(0.6, 0.8)"
                        />
                        {/* Front Face of Number 3 */}
                        <path
                            d="M45.5 56.5 C45.5 54.8 47.5 53.8 50.5 53.8 C54 53.8 56 55.5 56 57.5 C56 59.2 54.5 60.5 52.5 61.2 C55 61.8 56.8 63.5 56.8 66 C56.8 69 54 71 50.5 71 C47 71 44.8 69.5 44.5 67.5 L47.5 67.2 C47.7 68.2 49 68.8 50.5 68.8 C52.5 68.8 54 67.8 54 66 C54 64 52.5 63 50 63 L48 63 L48 61 L50 61 C52.2 61 53.5 60 53.5 58 C53.5 56.5 52.2 55.8 50.5 55.8 C48.8 55.8 47.8 56.5 47.6 57.2 Z"
                            fill="url(#bronzeBevelCut)"
                            stroke="#451A03"
                            strokeWidth="0.5"
                        />
                    </g>

                    {/* Specular Diagonal Sheen Sweep Across Coin */}
                    <g clipPath="url(#bronzeCoinBodyClip)">
                        <motion.rect
                            x="-20"
                            y="42"
                            width="16"
                            height="55"
                            fill="url(#bronzeSheenLight)"
                            transform="rotate(-25 50 67)"
                            animate={{
                                x: [-35, 115]
                            }}
                            transition={{
                                duration: 3.4,
                                repeat: Infinity,
                                repeatDelay: 1,
                                ease: "easeInOut"
                            }}
                        />
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}
