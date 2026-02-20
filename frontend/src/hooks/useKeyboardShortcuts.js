import { useEffect, useCallback } from 'react';

const defaultShortcuts = {
  'search': { key: 'k', meta: true },
  'sidebar': { key: 'b', meta: true },
  'darkmode': { key: 'd', meta: true, shift: true },
  'help': { key: '/', meta: true },
  'close': { key: 'Escape' },
  'nav-dashboard': { key: '1', meta: true },
  'nav-connections': { key: '2', meta: true },
  'save': { key: 's', meta: true },
};

export function useKeyboardShortcuts(handlers, deps = []) {
  const handleKeyDown = useCallback((e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const metaKey = isMac ? e.metaKey : e.ctrlKey;

    for (const [action, shortcut] of Object.entries(defaultShortcuts)) {
      if (!handlers[action]) continue;

      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const metaMatch = shortcut.meta ? metaKey : !metaKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey || !shortcut.shift;

      if (keyMatch && metaMatch && shiftMatch) {
        if (shortcut.key !== 'Escape') {
          e.preventDefault();
        }
        handlers[action]();
        return;
      }
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;

