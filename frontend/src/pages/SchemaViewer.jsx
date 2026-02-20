import { useState, useEffect } from 'react';
import { getAllDatabases, getSchema } from '../services/api';
import { Database, Table, Columns, Key, Loader, ChevronDown, ChevronRight, List, Hash, Link2, RefreshCw } from 'lucide-react';

const GlassCard = ({ children, className = "", hover = true, padding = true }) => (
  <div className={`
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
    ${hover ? 'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300' : ''}
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const DatabaseTypeBadge = ({ type }) => {
  const config = {
    mysql: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    postgresql: { color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    sqlite: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    mongodb: { color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  };
  const { color } = config[type?.toLowerCase()] || { color: 'bg-gray-500/10 text-gray-600' };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase ${color}`}>
      {type}
    </span>
  );
};

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

function SchemaViewer() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTables, setExpandedTables] = useState({});

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setConnectionsLoading(true);
      const response = await getAllDatabases();
      setConnections(response.data.filter(c => c.connection_status === 'connected'));
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleConnectionSelect = async (connectionId) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedConnection(connectionId);
      
      const response = await getSchema(connectionId);
      setSchema(response.data);
      setExpandedTables({});
    } catch (err) {
      setError('Failed to load schema');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const expandAll = () => {
    const tables = schema?.tables || schema?.collections || [];
    const all = {};
    tables.forEach(t => { all[t.name] = true; });
    setExpandedTables(all);
  };

  const collapseAll = () => {
    setExpandedTables({});
  };

  const selectedConn = connections.find(c => c.id === selectedConnection);

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
              <List className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Schema Viewer
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Explore database structures and relationships</p>
        </div>
        
        {schema && (
          <div className="flex items-center gap-2">
            <button 
              onClick={expandAll}
              className="px-4 py-2 text-sm bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-4 py-2 text-sm bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {
}
        <div className="col-span-12 lg:col-span-3">
          <GlassCard padding={false}>
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
              <h2 className="font-semibold text-gray-900 dark:text-white">Select Connection</h2>
            </div>
            <div className="p-4">
              {connectionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No connected databases</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <button
                      key={conn.id}
                      onClick={() => handleConnectionSelect(conn.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedConnection === conn.id
                          ? 'bg-[#2563EB] text-white shadow-lg'
                          : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Database className={`w-5 h-5 ${selectedConnection === conn.id ? 'text-white' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conn.name}</p>
                          <p className={`text-xs uppercase ${selectedConnection === conn.id ? 'text-white/70' : 'text-gray-500'}`}>
                            {conn.db_type}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {
}
        <div className="col-span-12 lg:col-span-9">
          <GlassCard padding={false} hover={false}>
            {!selectedConnection ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <Database className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Select a connection to view its schema</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading schema...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Database className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-500">{error}</p>
                </div>
              </div>
            ) : schema ? (
              <div>
                {
}
                <div className="px-6 py-5 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {schema.database_name}
                    </h2>
                    <DatabaseTypeBadge type={schema.database_type} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Table className="w-4 h-4" />
                      <span>{schema.tables?.length || schema.collections?.length || 0} {schema.database_type === 'mongodb' ? 'collections' : 'tables'}</span>
                    </div>
                  </div>
                </div>

                {
}
                <div className="p-6 space-y-4">
                  {(schema.tables || schema.collections) && (schema.tables || schema.collections).length > 0 ? (
                    (schema.tables || schema.collections).map((table) => (
                      <div key={table.name} className="border border-gray-200/50 dark:border-white/10 rounded-xl overflow-hidden bg-white/50 dark:bg-white/5">
                        {
}
                        <button
                          onClick={() => toggleTable(table.name)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-colors ${expandedTables[table.name] ? 'bg-blue-500/10' : 'bg-gray-100 dark:bg-white/10'}`}>
                              {expandedTables[table.name] ? (
                                <ChevronDown className="w-4 h-4 text-blue-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <Table className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold text-gray-900 dark:text-white">{table.name}</span>
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-lg text-xs text-gray-500 dark:text-gray-400">
                              {(table.row_count || table.document_count || 0).toLocaleString()} {schema.database_type === 'mongodb' ? 'docs' : 'rows'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Columns className="w-4 h-4" />
                              {(table.columns?.length || table.fields?.length || 0)}
                            </span>
                            {table.primary_keys && table.primary_keys.length > 0 && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Key className="w-4 h-4" />
                                {table.primary_keys.length}
                              </span>
                            )}
                            {table.foreign_keys && table.foreign_keys.length > 0 && (
                              <span className="flex items-center gap-1 text-purple-500">
                                <Link2 className="w-4 h-4" />
                                {table.foreign_keys.length}
                              </span>
                            )}
                          </div>
                        </button>

                        {
}
                        {expandedTables[table.name] && (
                          <div className="border-t border-gray-200/50 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-black/20">
                            {
}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Columns className="w-4 h-4" />
                                Columns
                              </h4>
                              <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-white/10">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-100/50 dark:bg-white/5">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Type</th>
                                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nullable</th>
                                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Default</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200/50 dark:divide-white/10 bg-white/50 dark:bg-white/5">
                                    {(table.columns || table.fields || []).map((col) => (
                                      <tr key={col.name} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                          <div className="flex items-center gap-2">
                                            {col.name}
                                            {table.primary_keys && table.primary_keys.includes(col.name) && (
                                              <Key className="w-3.5 h-3.5 text-amber-500" />
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <code className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg">
                                            {col.type}{col.length ? `(${col.length})` : ''}
                                          </code>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`text-xs px-2 py-1 rounded-lg ${
                                            col.nullable 
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                          }`}>
                                            {col.nullable ? 'Yes' : 'No'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs font-mono">
                                          {col.default || '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {
}
                            {table.foreign_keys && table.foreign_keys.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <Link2 className="w-4 h-4" />
                                  Foreign Keys
                                </h4>
                                <div className="space-y-2">
                                  {table.foreign_keys.map((fk, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
                                      <code className="font-medium text-blue-700 dark:text-blue-300">{fk.column}</code>
                                      <span className="text-gray-400">→</span>
                                      <code className="font-medium text-purple-700 dark:text-purple-300">{fk.references_table}.{fk.references_column}</code>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Table className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No {schema.database_type === 'mongodb' ? 'collections' : 'tables'} found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default SchemaViewer;

