import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      selectedConnection: null,
      setSelectedConnection: (connection) => set({ selectedConnection: connection }),
      
      recentQueries: [],
      addRecentQuery: (query) => set((state) => ({
        recentQueries: [query, ...state.recentQueries.filter(q => q !== query)].slice(0, 20)
      })),
      clearRecentQueries: () => set({ recentQueries: [] }),
      
      favorites: [],
      addFavorite: (item) => set((state) => ({
        favorites: [...state.favorites, item]
      })),
      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter(f => f.id !== id)
      })),
    }),
    {
      name: 'dblens-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        recentQueries: state.recentQueries,
        favorites: state.favorites,
      }),
    }
  )
);

export default useAppStore;

