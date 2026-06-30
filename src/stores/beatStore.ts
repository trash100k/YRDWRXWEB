import { create } from 'zustand'

interface BeatState {
  beatIndex: number
  beatT: number
  scanProgress: number
  totalProgress: number
  setBeatProgress: (totalProgress: number) => void
  setStaticBeat: (beat: number) => void
}

export const useBeatStore = create<BeatState>((set) => ({
  beatIndex: 0,
  beatT: 0,
  scanProgress: 0,
  totalProgress: 0,

  setBeatProgress: (totalProgress: number) => {
    const clamped = Math.max(0, Math.min(5.99, totalProgress * 6))
    const beatIndex = Math.min(Math.floor(clamped), 5)
    const beatT = clamped - beatIndex
    const scanProgress = beatIndex === 1 ? beatT : beatIndex > 1 ? 1 : 0
    set({ beatIndex, beatT, scanProgress, totalProgress })
  },

  setStaticBeat: (beat: number) => {
    set({ beatIndex: beat, beatT: 0, scanProgress: beat > 1 ? 1 : 0, totalProgress: beat / 6 })
  },
}))
