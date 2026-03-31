"use client";

let audioCtx: AudioContext | null = null;

// Function to initialize AudioContext on first user interaction
const initAudioContext = () => {
    if (!audioCtx) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        } catch (e) {
            console.error("Failed to initialize AudioContext:", e);
        }
    }
};

// Listen for a user interaction to initialize the AudioContext
if (typeof window !== "undefined") {
    document.addEventListener("click", initAudioContext, { once: true });
    document.addEventListener("keydown", initAudioContext, { once: true });
    document.addEventListener("touchstart", initAudioContext, { once: true });
}

// Zero-latency synth tones for warehouse feedback
const playTone = (freq: number, type: OscillatorType, duration: number) => {
    if (!audioCtx) {
        initAudioContext(); // Attempt to initialize if not already
        if (!audioCtx) return; // If still null, audio context is not available
    }

    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio playback error:", e);
        // Ignore audio errors (e.g., if user hasn't interacted with document yet)
    }
};

const triggerVibration = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

export const soundFX = {
    success: () => {
        playTone(880, "sine", 0.1); // High "Ding"
        triggerVibration(50);       // Short pulse
    },
    error: () => {
        playTone(220, "square", 0.3); // Low "Buzz"
        triggerVibration([100, 50, 100]); // Aggressive double pulse
    },
    duplicate: () => {
        playTone(440, "sine", 0.05); // Double "Blip"
        setTimeout(() => playTone(440, "sine", 0.05), 100);
        triggerVibration([30, 30, 30]); // Quick flutter
    }
};