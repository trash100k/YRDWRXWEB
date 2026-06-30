import { create } from 'zustand'

interface BeatState {
  beatIndex: number
  beatT: number
  scanProgress: number
  scanZ: number
  totalProgress: number
  setBeatProgress: (totalProgress: number) => void
  setStaticBeat: (beat: number) => void
}

// ─── Single source of truth for the scan wavefront's world-Z ──────────
// The scan sweeps the lawn on beat 1 from the far edge (z ≈ -10) to the near
// edge (z ≈ +10) on an ease-out curve, then settles just past the lawn (+12)
// for the rest of the timeline. Pre-scan it sits parked off the far edge.
// Every component (grass, mist, wake, trees, ground greening) reads THIS value
// so the sweep reads as one continuous wavefront — no per-component re-derivation
// with mismatched fallbacks, and no snap at the 1→2 handoff (the eased value is
// already ~+12 by the end of beat 1, so it blends smoothly into the +12 hold).
const SCAN_PARK_BEFORE = -12
const SCAN_PARK_AFTER = 12
function computeScanZ(beatIndex: number, beatT: number): number {
  if (beatIndex === 1) {
    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, beatT)), 2.5)
    return SCAN_PARK_BEFORE + (SCAN_PARK_AFTER - SCAN_PARK_BEFORE) * eased
  }
  return beatIndex >= 2 ? SCAN_PARK_AFTER : SCAN_PARK_BEFORE
}

export const useBeatStore = create<BeatState>((set) => ({
  beatIndex: 0,
  beatT: 0,
  scanProgress: 0,
  scanZ: SCAN_PARK_BEFORE,
  totalProgress: 0,

  setBeatProgress: (totalProgress: number) => {
    const clamped = Math.max(0, Math.min(5.99, totalProgress * 6))
    const beatIndex = Math.min(Math.floor(clamped), 5)
    const beatT = clamped - beatIndex
    const scanProgress = beatIndex === 1 ? beatT : beatIndex > 1 ? 1 : 0
    const scanZ = computeScanZ(beatIndex, beatT)
    set({ beatIndex, beatT, scanProgress, scanZ, totalProgress })
  },

  setStaticBeat: (beat: number) => {
    set({
      beatIndex: beat,
      beatT: 0,
      scanProgress: beat > 1 ? 1 : 0,
      scanZ: computeScanZ(beat, 0),
      totalProgress: beat / 6,
    })
  },
}))
