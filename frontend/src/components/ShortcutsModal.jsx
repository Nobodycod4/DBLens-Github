import { X, Command, Keyboard } from 'lucide-react';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['⌘', 'K'], description: 'Open search' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    { keys: ['⌘', '1'], description: 'Go to Dashboard' },
    { keys: ['⌘', '2'], description: 'Go to Connections' },
  ]},
  { category: 'Actions', items: [
    { keys: ['⌘', 'S'], description: 'Save' },
    { keys: ['⌘', '⇧', 'D'], description: 'Toggle dark mode' },
    { keys: ['⌘', '/'], description: 'Show shortcuts' },
    { keys: ['Esc'], description: 'Close modal/menu' },
  ]},
];

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {
}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#2563EB] text-white">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
}
        <div className="p-6 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                {section.category}
              </h3>
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.description}</span>
                    <div className="flex items-center gap-1.5">
                      {item.keys.map((key, j) => (
                        <kbd 
                          key={j} 
                          className="min-w-[28px] h-7 px-2 flex items-center justify-center text-xs font-mono bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-sm text-gray-600 dark:text-gray-400"
                        >
                          {key === '⌘' ? <Command className="w-3 h-3" /> : key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {
}
        <div className="px-6 py-4 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded text-[10px] font-mono">Ctrl</kbd> instead of <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded text-[10px] font-mono">⌘</kbd> on Windows/Linux
          </p>
        </div>
      </div>
    </div>
  );
}

