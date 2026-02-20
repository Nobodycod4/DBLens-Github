import { AlertTriangle, X, Trash2 } from 'lucide-react';

function DeleteModal({ connection, onClose, onConfirm }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {
}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Connection</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {
}
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure you want to delete the connection{' '}
              <span className="font-semibold">"{connection?.name}"</span>?
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All saved queries and configurations for this connection will be permanently lost.
          </p>
        </div>

        {
}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/50 dark:bg-white/5 border-t border-gray-200/50 dark:border-white/10">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/20 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium">
            <Trash2 className="w-4 h-4" />
            Delete Connection
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;

