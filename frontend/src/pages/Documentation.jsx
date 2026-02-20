
import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  FileText,
  Folder,
  Star,
  Clock,
  User,
  Lock,
  Inbox
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../contexts/PermissionContext';

const GlassCard = ({ children, className = "", padding = true }) => (
  <div className={`
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-sm overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
      </button>
    </div>
  );
};

const QuickStartContent = () => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Start Guide</h2>
    
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">1. Connect a Database</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Navigate to <strong>Connections</strong> and click <strong>Add Connection</strong>. 
          DBLens supports PostgreSQL, MySQL, SQLite, and MongoDB.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">2. Explore Your Schema</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Use the <strong>Schema Viewer</strong> to browse tables and columns, 
          or <strong>Schema Diagram</strong> for an interactive ERD visualization.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">3. Run Queries</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Open the <strong>SQL Playground</strong> to write and execute queries. 
          Results can be exported as CSV or JSON.
        </p>
        <CodeBlock code={`SELECT * FROM users LIMIT 10;`} />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">4. Monitor Health</h3>
        <p className="text-gray-600 dark:text-gray-400">
          The <strong>Monitoring</strong> page shows real-time database metrics including 
          connection count, query performance, and cache hit ratios.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">5. Backup & Migrate</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create backups from the <strong>Backups</strong> page. Use <strong>Migration</strong> 
          to move data between different database types.
        </p>
      </section>
    </div>
    
    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      <p className="text-sm text-blue-700 dark:text-blue-300">
        <strong>Need more help?</strong> Check the API documentation at{' '}
        <a href="/api/docs" target="_blank" className="underline">localhost:8000/docs</a>
      </p>
    </div>
  </div>
);

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('quickstart');
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'General' });

  let permissions = { hasPermission: () => true, isAdmin: () => false };
  try { const p = usePermissions(); if (p) permissions = p; } catch (e) {}
  const canCreateDocs = permissions.hasPermission('documentation.create') || permissions.isAdmin();

  useEffect(() => {
    const savedDocs = localStorage.getItem('dblens_user_docs');
    if (savedDocs) {
      try {
        setDocs(JSON.parse(savedDocs));
      } catch (e) {
        setDocs([]);
      }
    }
  }, []);

  const saveDocs = (newDocs) => {
    setDocs(newDocs);
    localStorage.setItem('dblens_user_docs', JSON.stringify(newDocs));
  };

  const handleCreateDoc = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    const newDoc = {
      id: Date.now(),
      title: formData.title,
      content: formData.content,
      category: formData.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    saveDocs([newDoc, ...docs]);
    toast.success('Documentation created');
    setShowCreateModal(false);
    setFormData({ title: '', content: '', category: 'General' });
  };

  const handleUpdateDoc = () => {
    if (!editingDoc) return;
    
    const updatedDocs = docs.map(doc => 
      doc.id === editingDoc.id 
        ? { ...doc, ...formData, updatedAt: new Date().toISOString() }
        : doc
    );
    
    saveDocs(updatedDocs);
    toast.success('Documentation updated');
    setEditingDoc(null);
    setFormData({ title: '', content: '', category: 'General' });
  };

  const handleDeleteDoc = (id) => {
    if (!confirm('Delete this documentation?')) return;
    saveDocs(docs.filter(d => d.id !== id));
    toast.success('Documentation deleted');
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setFormData({ title: doc.title, content: doc.content, category: doc.category });
  };

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['General', 'Setup', 'API', 'Database', 'Migration', 'Other'];

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#2563EB] text-white shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Documentation
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Guides, tutorials, and team documentation</p>
        </div>

        {canCreateDocs && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Doc
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {
}
        <div className="col-span-12 lg:col-span-3">
          <GlassCard className="sticky top-6">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('quickstart')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'quickstart'
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Quick Start
              </button>
              
              <button
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'team'
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <FileText className="w-4 h-4" />
                Team Docs
                {docs.length > 0 && (
                  <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    {docs.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'team' && (
              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-white/10">
              <a 
                href="http://localhost:8000/docs" 
                target="_blank"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
              >
                <ExternalLink className="w-4 h-4" />
                API Documentation
              </a>
            </div>
          </GlassCard>
        </div>

        {
}
        <div className="col-span-12 lg:col-span-9">
          {activeTab === 'quickstart' ? (
            <GlassCard>
              <QuickStartContent />
            </GlassCard>
          ) : (
            <>
              {filteredDocs.length === 0 ? (
                <GlassCard>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {searchTerm ? 'No matching docs' : 'No team documentation yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm 
                        ? 'Try a different search term'
                        : canCreateDocs 
                          ? 'Create the first documentation for your team'
                          : 'Documentation will appear here when created'
                      }
                    </p>
                    {canCreateDocs && !searchTerm && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-[#2563EB] text-white rounded-xl"
                      >
                        Create First Doc
                      </button>
                    )}
                  </div>
                </GlassCard>
              ) : (
                <div className="space-y-4">
                  {filteredDocs.map(doc => (
                    <GlassCard key={doc.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                              {doc.category}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {doc.title}
                          </h3>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {doc.content}
                          </div>
                        </div>
                        
                        {canCreateDocs && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(doc)}
                              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {
}
      {(showCreateModal || editingDoc) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingDoc ? 'Edit Documentation' : 'Create Documentation'}
              </h2>
              <button 
                onClick={() => { setShowCreateModal(false); setEditingDoc(null); setFormData({ title: '', content: '', category: 'General' }); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Documentation title"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your documentation content here..."
                  rows={12}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl resize-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setEditingDoc(null); }}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={editingDoc ? handleUpdateDoc : handleCreateDoc}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white rounded-xl"
              >
                <Save className="w-4 h-4" />
                {editingDoc ? 'Save Changes' : 'Create Doc'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

