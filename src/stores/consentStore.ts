import { create } from 'zustand'

const STORAGE_KEY = 'bazilens.consent.v1'

export type Consent = {
  necessary: true
  analytics: boolean
  errors: boolean
  marketing: boolean
  agreedAt: string | null
}

const DEFAULT: Consent = {
  necessary: true,
  analytics: false,
  errors: false,
  marketing: false,
  agreedAt: null,
}

type ConsentState = {
  consent: Consent
  hydrated: boolean
  restore: () => void
  save: (next: Partial<Omit<Consent, 'necessary' | 'agreedAt'>>) => Consent
}

export const useConsentStore = create<ConsentState>((set) => ({
  consent: DEFAULT,
  hydrated: false,
  restore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as Consent
        set({ consent: { ...DEFAULT, ...stored, necessary: true }, hydrated: true })
        return
      }
    } catch {
      // localStorage may be blocked; fall through to default.
    }
    set({ hydrated: true })
  },
  save: (next) => {
    const consent: Consent = {
      ...DEFAULT,
      ...next,
      necessary: true,
      agreedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
    } catch {
      // Same as above; consent is in-memory only.
    }
    set({ consent, hydrated: true })
    return consent
  },
}))
