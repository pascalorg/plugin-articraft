import { create } from 'zustand'
import type { ArticraftCatalogItem } from './types'

type ArticraftStore = {
  selectedItem: ArticraftCatalogItem | null
  setSelectedItem: (item: ArticraftCatalogItem) => void
}

export const useArticraftStore = create<ArticraftStore>((set) => ({
  selectedItem: null,
  setSelectedItem: (selectedItem) => set({ selectedItem }),
}))
