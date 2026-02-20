import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OrgSwitcher() {
  const { organizations, currentOrgId, setCurrentOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = organizations.find((o) => o.id === currentOrgId) || organizations[0];
  const label = current?.name || 'Workspace';

  if (!organizations.length) return null;
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
        <div className="w-8 h-8 rounded-lg bg-brand-primary/20 dark:bg-brand-primary/30 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-brand-primary" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-colors text-left min-w-0"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-primary/20 dark:bg-brand-primary/30 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-brand-primary" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
          {label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 py-1 w-56 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setCurrentOrg(org.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                org.id === currentOrgId
                  ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{org.name || `Org ${org.id}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

