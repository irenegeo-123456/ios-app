import { create } from 'zustand'

// What the side panel shows about the running app: the prototype's name, its director scenes and kit links.

export interface PanelScene {
  label: string
  run: () => void
}

interface KitPanel {
  title: string
  subtitle?: string
  scenes: PanelScene[]
  links: { label: string; href: string }[]
  /** what's wrong with the running prototype, in plain words */
  problems: string[]
  /** every prototype's slug, and the one running */
  prototypes: string[]
  current?: string
  setPanel: (p: Partial<Omit<KitPanel, 'setPanel'>>) => void
}

export const useKitPanel = create<KitPanel>((set) => ({
  title: 'Northstar demo',
  subtitle: 'The default workspace',
  scenes: [],
  links: [],
  problems: [],
  prototypes: [],
  setPanel: (p) => set(p),
}))
