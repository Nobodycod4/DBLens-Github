import { useState, useEffect } from 'react';
import { X, Database, Server, Lock, Settings, Info } from 'lucide-react';

function ConnectionModal({ connection, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
    ssl_enabled: false,
    connection_timeout: 30,
    description: '',
    tags: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name || '',
        db_type: connection.db_type || 'postgresql',
        host: connection.host || 'localhost',
        port: connection.port || 5432,
        database_name: connection.database_name || '',
        username: connection.username || '',
        password: '',
        ssl_enabled: connection.ssl_enabled || false,
        connection_timeout: connection.connection_timeout || 30,
        description: connection.description || '',
        tags: connection.tags || '',
        is_active: connection.is_active ?? true
      });
    }
  }, [connection]);

  const dbTypes = [
    { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, requiresAuth: true, bg: 'bg-[#6366F1]' },
    { value: 'mysql', label: 'MySQL', defaultPort: 3306, requiresAuth: true, bg: 'bg-[#2563EB]' },
    { value: 'mongodb', label: 'MongoDB', defaultPort: 27017, requiresAuth: false, bg: 'bg-[#059669]' },
    { value: 'sqlite', label: 'SQLite', defaultPort: null, requiresAuth: false, bg: 'bg-[#EA580C]' }
  ];

  const requiresAuth = () => {
    const dbType = dbTypes.find(t => t.value === formData.db_type);
    return dbType?.requiresAuth ?? true;
  };

  const currentDbType = dbTypes.find(t => t.value === formData.db_type);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    if (name === 'port') newValue = parseInt(value) || '';
    if (name === 'connection_timeout') newValue = parseInt(value) || 30;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDbTypeChange = (e) => {
    const type = e.target.value;
    const dbType = dbTypes.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      db_type: type,
      port: dbType.defaultPort || prev.port,
      username: dbType.requiresAuth ? prev.username : '',
      password: dbType.requiresAuth ? prev.password : ''
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.host.trim() && formData.db_type !== 'sqlite') newErrors.host = 'Host is required';
    if (!formData.port && formData.db_type !== 'sqlite') newErrors.port = 'Port is required';
    if (!formData.database_name.trim()) newErrors.database_name = formData.db_type === 'sqlite' ? 'Database file path is required' : 'Database name is required';
    if (requiresAuth()) {
      if (!formData.username.trim()) newErrors.username = 'Username is required';
      if (!formData.password.trim() && !connection) newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const dataToSave = { ...formData };
    if (connection && !dataToSave.password.trim()) delete dataToSave.password;
    if (!requiresAuth()) {
      if (!dataToSave.username) dataToSave.username = '';
      if (!dataToSave.password) dataToSave.password = '';
    }
    onSave(dataToSave);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          {
}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-[#2563EB] text-white shadow-lg`}>
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {connection ? 'Edit Connection' : 'Add New Connection'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure your database connection</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {
}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {
}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} placeholder="My Production Database" />
              {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name}</p>}
            </div>

            {
}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database Type *</label>
              <div className="grid grid-cols-4 gap-3">
                {dbTypes.map(type => (
                  <button key={type.value} type="button" onClick={() => handleDbTypeChange({ target: { value: type.value } })} className={`p-4 rounded-xl border-2 transition-all text-center ${formData.db_type === type.value ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20` : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}>
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${type.bg} flex items-center justify-center`}>
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${formData.db_type === type.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {
}
            {formData.db_type !== 'sqlite' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Host *</label>
                  <div className="relative">
                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" name="host" value={formData.host} onChange={handleChange} className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.host ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} placeholder="localhost" />
                  </div>
                  {errors.host && <p className="mt-2 text-sm text-red-500">{errors.host}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Port *</label>
                  <input type="number" name="port" value={formData.port} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.port ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} />
                  {errors.port && <p className="mt-2 text-sm text-red-500">{errors.port}</p>}
                </div>
              </div>
            )}

            {
}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{formData.db_type === 'sqlite' ? 'Database File Path *' : 'Database Name *'}</label>
              <input type="text" name="database_name" value={formData.database_name} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.database_name ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} placeholder={formData.db_type === 'sqlite' ? '/path/to/database.db' : 'mydatabase'} />
              {errors.database_name && <p className="mt-2 text-sm text-red-500">{errors.database_name}</p>}
              {formData.db_type === 'sqlite' && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Enter the full path to your SQLite database file</p>}
            </div>

            {
}
            {(requiresAuth() || formData.db_type === 'mongodb') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username {requiresAuth() ? '*' : <span className="text-gray-400">(Optional)</span>}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.username ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} placeholder="admin" />
                  </div>
                  {errors.username && <p className="mt-2 text-sm text-red-500">{errors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password {requiresAuth() && !connection ? '*' : <span className="text-gray-400">(Optional)</span>}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`} placeholder={connection ? 'Leave blank to keep current' : '••••••••'} />
                  {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password}</p>}
                </div>
              </div>
            )}

            {
}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Optional description..." />
            </div>

            {
}
            <div className="pt-4 border-t border-gray-200/50 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Advanced Options</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Timeout (seconds)</label>
                  <input type="number" name="connection_timeout" value={formData.connection_timeout} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="flex items-center gap-6 pt-8">
                  {formData.db_type !== 'sqlite' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="ssl_enabled" checked={formData.ssl_enabled} onChange={handleChange} className="w-4 h-4 accent-blue-500 rounded" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Enable SSL</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 accent-blue-500 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {
}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/20 transition-colors font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all font-medium">
              {connection ? 'Update Connection' : 'Add Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectionModal;

