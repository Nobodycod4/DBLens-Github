import { useState, useEffect, useRef } from 'react';
import { getAllDatabases, executeQuery, executeWriteQuery } from '../services/api';
import { Database, Play, Loader, Download, Copy, CheckCircle, Code, Zap, Table, Terminal, Clock, Hash, AlertCircle, History, Star, Trash2, RotateCcw, X, Sparkles, BookOpen, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const validateQuery = (query) => {
  if (!query || !query.trim()) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  
  const trimmed = query.trim().toUpperCase();
  const validStarts = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH', 'TRUNCATE', 'USE', 'SET'];
  
  const startsValid = validStarts.some(keyword => trimmed.startsWith(keyword));
  if (!startsValid) {
    return { valid: false, error: 'Query must start with a valid SQL keyword (SELECT, INSERT, UPDATE, etc.)' };
  }
  
  const openParens = (query.match(/\(/g) || []).length;
  const closeParens = (query.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return { valid: false, error: 'Unbalanced parentheses in query' };
  }
  
  const singleQuotes = (query.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unbalanced single quotes in query' };
  }
  
  return { valid: true };
};

const WRITE_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
const isWriteQuery = (q) => {
  const t = (q || '').trim().toUpperCase();
  return WRITE_KEYWORDS.some((kw) => t.startsWith(kw));
};

const queryTemplates = [
  { name: 'Select All', query: 'SELECT * FROM table_name LIMIT 10;', category: 'Basic' },
  { name: 'Count Rows', query: 'SELECT COUNT(*) FROM table_name;', category: 'Basic' },
  { name: 'Filter Data', query: "SELECT * FROM table_name WHERE column_name = 'value';", category: 'Basic' },
  { name: 'Join Tables', query: 'SELECT a.*, b.column_name\nFROM table_a a\nJOIN table_b b ON a.id = b.a_id;', category: 'Joins' },
  { name: 'Left Join', query: 'SELECT a.*, b.column_name\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.a_id;', category: 'Joins' },
  { name: 'Group By', query: 'SELECT column_name, COUNT(*) as count\nFROM table_name\nGROUP BY column_name\nORDER BY count DESC;', category: 'Aggregation' },
  { name: 'Subquery', query: 'SELECT * FROM table_name\nWHERE id IN (SELECT id FROM other_table WHERE condition);', category: 'Advanced' },
  { name: 'Insert Row', query: "INSERT INTO table_name (column1, column2)\nVALUES ('value1', 'value2');", category: 'Write' },
  { name: 'Update Row', query: "UPDATE table_name\nSET column_name = 'new_value'\nWHERE id = 1;", category: 'Write' },
  { name: 'Delete Row', query: 'DELETE FROM table_name WHERE id = 1;', category: 'Write' },
];

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

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

function QueryEditor() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [query, setQuery] = useState('-- Welcome to the SQL Playground!\n-- Select a connection and write your query below\n\nSELECT * FROM table_name LIMIT 10;');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [writeConfirm, setWriteConfirm] = useState(null);
  const templatesRef = useRef(null);

  useEffect(() => {
    if (!showTemplates) return;
    const handleClickOutside = (e) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTemplates]);

  const loadTemplate = (template) => {
    setQuery(template.query);
    setShowTemplates(false);
    toast.success(`Loaded "${template.name}" template`);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('dblens_query_history');
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load query history');
      }
    }
  }, []);

  const saveQueryHistory = (history) => {
    setQueryHistory(history);
    localStorage.setItem('dblens_query_history', JSON.stringify(history));
  };

  const addToHistory = (queryText, database, executionTime, rowCount, success) => {
    const newEntry = {
      id: Date.now(),
      query: queryText,
      database: database,
      executionTime,
      rowCount,
      success,
      timestamp: new Date().toISOString(),
      starred: false,
    };
    
    const updatedHistory = [newEntry, ...queryHistory.slice(0, 49)];
    saveQueryHistory(updatedHistory);
  };

  const toggleStar = (id) => {
    const updatedHistory = queryHistory.map(q => 
      q.id === id ? { ...q, starred: !q.starred } : q
    );
    saveQueryHistory(updatedHistory);
  };

  const deleteFromHistory = (id) => {
    const updatedHistory = queryHistory.filter(q => q.id !== id);
    saveQueryHistory(updatedHistory);
  };

  const clearHistory = () => {
    if (!confirm('Clear all query history?')) return;
    saveQueryHistory([]);
    toast.success('History cleared');
  };

  const loadFromHistory = (historyQuery) => {
    setQuery(historyQuery.query);
    setShowHistory(false);
    toast.success('Query loaded');
  };

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

  const runWriteWithConfirm = async (confirmed) => {
    if (!writeConfirm) return;
    const { connectionId, queryText } = writeConfirm;
    setWriteConfirm(null);
    const selectedConn = connections.find((c) => c.id === parseInt(connectionId));
    try {
      setLoading(true);
      setError(null);
      setResults(null);
      const response = await executeWriteQuery(
        connectionId,
        { query: queryText.trim() },
        confirmed
      );
      const data = response.data;
      if (data.requires_confirmation && !confirmed) {
        setWriteConfirm({ connectionId, queryText });
        return;
      }
      setResults({
        columns: ['Result'],
        rows: [{ Result: data.message || `${data.rows_affected ?? 0} rows affected` }],
        row_count: 1,
        isWriteResult: true,
        rows_affected: data.rows_affected,
        execution_time_ms: data.execution_time_ms,
      });
      toast.success(data.message || `Done in ${data.execution_time_ms}ms`);
      addToHistory(queryText.trim(), selectedConn?.name || 'Unknown', data.execution_time_ms ?? 0, data.rows_affected ?? 0, true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      toast.error('Write failed');
      addToHistory(queryText.trim(), selectedConn?.name || 'Unknown', 0, 0, false);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedConnection) {
      toast.error('Please select a database connection first');
      return;
    }

    const validation = validateQuery(query);
    if (!validation.valid) {
      setError(`Invalid Query: ${validation.error}`);
      toast.error(validation.error);
      return;
    }

    const selectedConn = connections.find((c) => c.id === parseInt(selectedConnection));
    const queryText = query.trim();
    const isWrite = isWriteQuery(queryText);

    try {
      setLoading(true);
      setError(null);
      setResults(null);

      if (isWrite) {
        const response = await executeWriteQuery(selectedConnection, { query: queryText }, false);
        const data = response.data;
        if (data.requires_confirmation) {
          setWriteConfirm({ connectionId: selectedConnection, queryText });
          setLoading(false);
          return;
        }
        setResults({
          columns: ['Result'],
          rows: [{ Result: data.message || `${data.rows_affected ?? 0} rows affected` }],
          row_count: 1,
          isWriteResult: true,
          rows_affected: data.rows_affected,
          execution_time_ms: data.execution_time_ms,
        });
        toast.success(data.message || `Done in ${data.execution_time_ms}ms`);
        addToHistory(queryText, selectedConn?.name || 'Unknown', data.execution_time_ms ?? 0, data.rows_affected ?? 0, true);
      } else {
        const response = await executeQuery(selectedConnection, { query: queryText, limit: 100 });
        setResults(response.data);
        toast.success(`Query executed in ${response.data.execution_time_ms}ms`);
        addToHistory(queryText, selectedConn?.name || 'Unknown', response.data.execution_time_ms, response.data.row_count, true);
      }
    } catch (err) {
      let errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
      if (errorMsg?.includes('syntax error')) errorMsg = `SQL Syntax Error: ${errorMsg}`;
      else if (errorMsg?.includes('does not exist') || errorMsg?.includes("doesn't exist")) errorMsg = `Table/Column Not Found: ${errorMsg}`;
      else if (errorMsg?.includes('permission denied')) errorMsg = `Permission Denied: ${errorMsg}`;
      setError(errorMsg);
      toast.error(isWrite ? 'Write failed' : 'Query execution failed');
      addToHistory(queryText, selectedConn?.name || 'Unknown', 0, 0, false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResults = () => {
    if (!results || !results.rows) return;
    
    const csv = [
      results.columns.join(','),
      ...results.rows.map(row => 
        results.columns.map(col => JSON.stringify(row[col] ?? '')).join(',')
      )
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (!results || !results.rows) return;
    
    const csv = [
      results.columns.join(','),
      ...results.rows.map(row => 
        results.columns.map(col => JSON.stringify(row[col] ?? '')).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded CSV');
  };

  const sampleQueries = [
    { label: 'Show Tables', query: 'SHOW TABLES;', icon: Table },
    { label: 'Select All', query: 'SELECT * FROM table_name LIMIT 10;', icon: Database },
    { label: 'Count Rows', query: 'SELECT COUNT(*) as total FROM table_name;', icon: Hash },
    { label: 'Describe Table', query: 'DESCRIBE table_name;', icon: Terminal },
  ];

  const selectedConn = connections.find(c => c.id === parseInt(selectedConnection));

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      {writeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm write operation</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              This query will modify or delete data. This action cannot be undone. Make sure you have a backup if needed.
            </p>
            <pre className="bg-gray-100 dark:bg-white/5 rounded-lg p-3 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto mb-4 max-h-24 overflow-y-auto">
              {writeConfirm.queryText}
            </pre>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setWriteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runWriteWithConfirm(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#059669] text-white shadow-lg">
              <Code className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              SQL Playground
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Write, test, and execute SQL queries on your databases</p>
        </div>
        
        {
}
        <div className="relative">
          <div ref={showTemplates ? templatesRef : null} className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl transition-all font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Templates
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-2 max-h-96 overflow-y-auto" role="menu">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-3 py-2">Query Templates</p>
                {['Basic', 'Joins', 'Aggregation', 'Advanced', 'Write'].map(category => (
                  <div key={category} className="mb-2">
                    <p className="text-xs text-gray-400 px-3 py-1">{category}</p>
                    {queryTemplates.filter(t => t.category === category).map(template => (
                      <button
                        key={template.name}
                        type="button"
                        role="menuitem"
                        onClick={(e) => { e.stopPropagation(); loadTemplate(template); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                      >
                        <Code className="w-4 h-4 text-amber-500" />
                        {template.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {
}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {
}
          <GlassCard>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Connection
            </label>
            {connectionsLoading ? (
              <Skeleton className="h-12" />
            ) : (
              <select
                value={selectedConnection || ''}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
              >
                <option value="">Choose a database...</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.db_type.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
            {selectedConn && (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Connected to {selectedConn.database_name}
                </span>
              </div>
            )}
          </GlassCard>

          {
}
          <GlassCard padding={false} hover={false}>
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-white">SQL Query</span>
              </div>
              <button
                onClick={handleExecute}
                disabled={loading || !selectedConnection}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-48 px-4 py-3 font-mono text-sm bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="Enter your SQL query here..."
              />
            </div>
          </GlassCard>

          {
}
          <GlassCard padding={false} hover={false}>
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">Results</span>
                </div>
                {results && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      {results.row_count} rows
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {results.execution_time_ms}ms
                    </span>
                  </div>
                )}
              </div>
              {results && results.rows?.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyResults}
                    className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Copy as CSV"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    title="Download CSV"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6">
              {error ? (
                <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-700 dark:text-red-400 mb-2">Invalid Query</p>
                        <pre className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg max-h-40 overflow-y-auto">{error}</pre>
                        <p className="text-xs text-red-500/70 mt-2">Check your SQL syntax and try again</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="p-1.5 hover:bg-red-200 dark:hover:bg-red-800/30 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ) : !results ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <Database className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Execute a query to see results</p>
                </div>
              ) : results.rows?.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Table className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No results found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-white/10">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/50 dark:bg-white/5">
                      <tr>
                        {results.columns.map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-white/10 bg-white/50 dark:bg-white/5">
                      {results.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          {results.columns.map((col) => (
                            <td key={col} className="px-4 py-3 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                              {row[col] === null ? (
                                <span className="text-gray-400 italic">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {
}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {
}
          <GlassCard padding={false}>
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-500" />
                Query History
                {queryHistory.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                    {queryHistory.length}
                  </span>
                )}
              </h3>
              {queryHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {queryHistory.length === 0 ? (
                <div className="p-6 text-center">
                  <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No queries yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {queryHistory.slice(0, 10).map((historyItem) => (
                    <div
                      key={historyItem.id}
                      className="group relative px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <button
                        onClick={() => loadFromHistory(historyItem)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                            historyItem.success ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                              {historyItem.query}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{historyItem.database}</span>
                              <span>•</span>
                              <span>{historyItem.executionTime}ms</span>
                              <span>•</span>
                              <span>{new Date(historyItem.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleStar(historyItem.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            historyItem.starred 
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${historyItem.starred ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => deleteFromHistory(historyItem.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {queryHistory.length > 10 && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="w-full text-center py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl"
                    >
                      View all {queryHistory.length} queries
                    </button>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {
}
          {queryHistory.filter(q => q.starred).length > 0 && (
            <GlassCard padding={false}>
              <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                  Starred Queries
                </h3>
              </div>
              <div className="p-2 space-y-1">
                {queryHistory.filter(q => q.starred).map((historyItem) => (
                  <button
                    key={historyItem.id}
                    onClick={() => loadFromHistory(historyItem)}
                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors"
                  >
                    <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                      {historyItem.query}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {historyItem.database}
                    </p>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {
}
          <GlassCard padding={false}>
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Queries
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {sampleQueries.map((sample, idx) => {
                const Icon = sample.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setQuery(sample.query)}
                    className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Icon className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{sample.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">{sample.query}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {
}
          <GlassCard className="bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Safety Notice</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed. 
                  Destructive operations are blocked for safety.
                </p>
              </div>
            </div>
          </GlassCard>

          {
}
          <GlassCard padding={false}>
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
              <h3 className="font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Execute Query</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300">Ctrl + Enter</kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Clear Query</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300">Ctrl + L</kbd>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {
}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-3xl w-full max-h-[80vh] overflow-hidden" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-500" />
                Query History ({queryHistory.length})
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] space-y-2">
              {queryHistory.map((historyItem) => (
                <div
                  key={historyItem.id}
                  className="group p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${historyItem.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{historyItem.database}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{new Date(historyItem.timestamp).toLocaleString()}</span>
                        {historyItem.starred && <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />}
                      </div>
                      <pre className="text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all bg-white dark:bg-black/20 p-3 rounded-lg">
                        {historyItem.query}
                      </pre>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{historyItem.executionTime}ms</span>
                        <span>{historyItem.rowCount} rows</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadFromHistory(historyItem)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Load query"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStar(historyItem.id)}
                        className={`p-2 rounded-lg ${
                          historyItem.starred 
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                            : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${historyItem.starred ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => deleteFromHistory(historyItem.id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default QueryEditor;

