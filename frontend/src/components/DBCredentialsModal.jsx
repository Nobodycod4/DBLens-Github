import { useState } from 'react';
import { X, Key } from 'lucide-react';

function DBCredentialsModal({ onClose, onConfirm, title = 'Database credentials' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      await onConfirm(username.trim(), password);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-md p-6 shadow-xl border border-white/20 dark:border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-[#2563EB]" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Default credentials are not set. Enter the username and password for this database.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              placeholder="e.g. admin"
              required
              autoFocus
            />
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DBCredentialsModal;

