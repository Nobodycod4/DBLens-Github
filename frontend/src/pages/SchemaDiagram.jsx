
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TableNode from '../components/diagram/TableNode';
import { mapSchemaToFlow, exportDiagram, filterTablesByName } from '../utils/schemaMapper';
import { getAllDatabases, getSchema } from '../services/api';
import { 
  Database, 
  Search, 
  Download, 
  Maximize, 
  Minimize,
  Loader,
  Map as MapIcon,
  Network,
  Table,
  Link2,
  Key,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Image,
  FileJson,
  LayoutGrid,
  ArrowRight,
  Eye,
  EyeOff,
  Palette,
  Settings2,
  Info,
  Hash,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

const TABLE_COLORS = [
  { name: 'Blue', bg: 'from-blue-500 to-blue-600', dot: 'bg-blue-500' },
  { name: 'Purple', bg: 'from-purple-500 to-purple-600', dot: 'bg-purple-500' },
  { name: 'Teal', bg: 'from-teal-500 to-teal-600', dot: 'bg-teal-500' },
  { name: 'Orange', bg: 'from-orange-500 to-orange-600', dot: 'bg-orange-500' },
  { name: 'Pink', bg: 'from-pink-500 to-pink-600', dot: 'bg-pink-500' },
  { name: 'Emerald', bg: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-500' },
  { name: 'Indigo', bg: 'from-indigo-500 to-indigo-600', dot: 'bg-indigo-500' },
  { name: 'Cyan', bg: 'from-cyan-500 to-cyan-600', dot: 'bg-cyan-500' },
];

const DB_TYPE_COLORS = {
  postgresql: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mysql: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  sqlite: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  mongodb: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function SchemaDiagram() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [tableColors, setTableColors] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut, getNodes } = useReactFlow();
  const diagramRef = useRef(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  const edgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: false,
    style: { 
      strokeWidth: 2,
      stroke: '#a855f7'
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: '#a855f7'
    }
  }), []);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await getAllDatabases();
      const connectedOnes = response.data.filter(c => c.connection_status === 'connected');
      setConnections(connectedOnes);
      if (connectedOnes.length > 0 && !selectedConnection) {
        setSelectedConnection(connectedOnes[0].id);
      }
    } catch (error) {
      toast.error('Failed to load connections');
    }
  };

  useEffect(() => {
    if (!selectedConnection) return;

    const loadSchema = async () => {
      setLoading(true);
      try {
        const response = await getSchema(selectedConnection);
        const schemaData = response.data;
        
        if (!schemaData.success) {
          throw new Error(schemaData.error || 'Failed to load schema');
        }
        
        setSchema(schemaData);
        updateDiagram(schemaData, searchTerm);
        toast.success(`Loaded ${schemaData.tables?.length || 0} tables`);
      } catch (error) {
        toast.error(error.message || 'Failed to load schema');
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [selectedConnection]);

  const updateDiagram = useCallback((schemaData, search) => {
    if (!schemaData) return;

    const filteredSchema = search 
      ? { ...schemaData, tables: filterTablesByName(schemaData.tables, search) }
      : schemaData;
    
    const tablesWithColors = filteredSchema.tables?.map((table, idx) => ({
      ...table,
      colorIndex: tableColors[table.name] ?? (idx % TABLE_COLORS.length)
    }));
    
    const { nodes: newNodes, edges: newEdges } = mapSchemaToFlow(
      { ...filteredSchema, tables: tablesWithColors },
      { useHierarchicalLayout: true }
    );
    
    const styledEdges = newEdges.map(edge => ({
      ...edge,
      ...edgeOptions,
      hidden: !showRelationships
    }));
    
    setNodes(newNodes);
    setEdges(styledEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
  }, [tableColors, showRelationships, setNodes, setEdges, fitView, edgeOptions]);

  useEffect(() => {
    if (schema) {
      updateDiagram(schema, searchTerm);
    }
  }, [searchTerm, schema, showRelationships, updateDiagram]);

  const onNodeClick = useCallback((event, node) => {
    const table = schema?.tables?.find(t => t.name === node.data.name);
    setSelectedTable(table);
  }, [schema]);

  const handleExportImage = async () => {
    if (!diagramRef.current) return;
    
    try {
      const canvas = await html2canvas(diagramRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `${schema?.database_name || 'schema'}_diagram.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Image exported!');
    } catch (error) {
      toast.error('Failed to export image');
    }
  };

  const handleExportJson = () => {
    if (!schema) return;
    
    const diagram = exportDiagram(nodes, edges, {
      database_name: schema.database_name,
      database_type: schema.database_type
    });
    
    const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.database_name}_diagram.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('JSON exported!');
  };

  const handleAutoLayout = () => {
    if (schema) {
      updateDiagram(schema, searchTerm);
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const getTableStats = (table) => {
    const pkCount = table.primary_keys?.length || 0;
    const fkCount = table.foreign_keys?.length || 0;
    const colCount = table.columns?.length || table.fields?.length || 0;
    return { pkCount, fkCount, colCount };
  };

  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];
    if (!searchTerm) return schema.tables;
    return schema.tables.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [schema, searchTerm]);

  return (
    <div className="w-full h-[calc(100vh-80px)] flex bg-primary">
      {
}
      <div className={`
        relative flex-shrink-0 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-72' : 'w-0'}
      `}>
        <div className={`
          absolute inset-y-0 left-0 w-72 bg-white/90 dark:bg-[#1a1a2e]/95 backdrop-blur-xl
          border-r border-gray-200/50 dark:border-white/10 flex flex-col
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {
}
          <div className="p-4 border-b border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0D9488] text-white">
                  <Network className="w-4 h-4" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">Tables</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {
}
            <select
              value={selectedConnection || ''}
              onChange={(e) => setSelectedConnection(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 mb-3"
              disabled={loading}
            >
              <option value="">Select database...</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.db_type})
                </option>
              ))}
            </select>

            {
}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {
}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 text-teal-500 animate-spin" />
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'No matching tables' : 'No tables found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTables.map((table, idx) => {
                  const stats = getTableStats(table);
                  const colorIdx = tableColors[table.name] ?? (idx % TABLE_COLORS.length);
                  const isSelected = selectedTable?.name === table.name;

                  return (
                    <button
                      key={table.name}
                      onClick={() => setSelectedTable(table)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
                        ${isSelected 
                          ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-500/30' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/5'}
                      `}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${TABLE_COLORS[colorIdx].dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {table.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {stats.colCount} cols
                          </span>
                          {stats.pkCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                              <Key className="w-2.5 h-2.5" />
                              {stats.pkCount}
                            </span>
                          )}
                          {stats.fkCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400">
                              <Link2 className="w-2.5 h-2.5" />
                              {stats.fkCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {
}
          {schema && (
            <div className="p-4 border-t border-gray-200/50 dark:border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{filteredTables.length} tables</span>
                <span className={`px-2 py-0.5 rounded-full ${DB_TYPE_COLORS[schema.database_type] || 'bg-gray-100 text-gray-600'}`}>
                  {schema.database_type}
                </span>
              </div>
            </div>
          )}
        </div>

        {
}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white/90 dark:bg-[#1a1a2e]/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-white/10 shadow-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {
}
      <div className="flex-1 flex flex-col min-w-0">
        {
}
        <div className="relative z-10 flex items-center justify-between gap-4 px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
          <div className="flex items-center gap-2">
            {
}
            <div className="flex items-center bg-white dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <button
                onClick={() => zoomOut()}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => zoomIn()}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => fitView({ padding: 0.2, duration: 300 })}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Fit View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

            {
}
            <button
              onClick={handleAutoLayout}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Auto Layout</span>
            </button>

            {
}
            <button
              onClick={() => setShowRelationships(!showRelationships)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                showRelationships 
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400' 
                  : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showRelationships ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">Relations</span>
            </button>

            {
}
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                showMiniMap 
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400' 
                  : 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {
}
            <div ref={showExportMenu ? exportMenuRef : null} className="relative z-[100]">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0f766e] text-white rounded-xl transition-all font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 z-[100] bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); handleExportImage(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-t-xl"
                  >
                    <Image className="w-4 h-4" />
                    Export as PNG
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); handleExportJson(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-b-xl"
                  >
                    <FileJson className="w-4 h-4" />
                    Export as JSON
                  </button>
                </div>
              )}
            </div>

            {
}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {
}
        <div className="flex-1 relative" ref={diagramRef}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl z-10">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0D9488]/20 flex items-center justify-center">
                  <Loader className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading schema...</p>
              </div>
            </div>
          ) : !selectedConnection ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <Database className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Database Selected</h3>
                <p className="text-gray-500 dark:text-gray-400">Select a database from the sidebar to visualize its schema</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <Table className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {searchTerm ? 'No Matching Tables' : 'No Tables Found'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try a different search term' : 'This database has no tables'}
                </p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.05}
              maxZoom={3}
              defaultEdgeOptions={edgeOptions}
              className="bg-transparent"
            >
              <Background 
                color="#94a3b8" 
                gap={24}
                size={1}
                className="dark:opacity-10 opacity-30"
              />
              <Controls 
                showInteractive={false}
                className="!bg-white/90 dark:!bg-[#1a1a2e]/90 !backdrop-blur-xl !border !border-gray-200/50 dark:!border-white/10 !rounded-xl !shadow-lg"
                style={{ display: 'none' }} // Hidden, using custom controls
              />
              
              {showMiniMap && (
                <MiniMap 
                  nodeColor={(node) => {
                    const colorIdx = node.data?.colorIndex || 0;
                    return ['#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#10b981', '#6366f1', '#06b6d4'][colorIdx % 8];
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                  className="!bg-white/90 dark:!bg-[#1a1a2e]/90 !backdrop-blur-xl !border !border-gray-200/50 dark:!border-white/10 !rounded-xl !shadow-lg"
                  style={{ width: 180, height: 120 }}
                  zoomable
                  pannable
                />
              )}
            </ReactFlow>
          )}
        </div>
      </div>

      {
}
      {selectedTable && (
        <div className="w-80 flex-shrink-0 bg-white/90 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-white/10 flex flex-col">
          {
}
          <div className="p-4 border-b border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${TABLE_COLORS[tableColors[selectedTable.name] ?? 0].dot}`} />
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{selectedTable.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DB_TYPE_COLORS[schema?.database_type] || 'bg-gray-100 text-gray-600'}`}>
                {selectedTable.type || 'TABLE'}
              </span>
              {selectedTable.row_count !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedTable.row_count.toLocaleString()} rows
                </span>
              )}
            </div>
          </div>

          {
}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Columns ({selectedTable.columns?.length || 0})
              </h4>
              <div className="space-y-1">
                {(selectedTable.columns || selectedTable.fields || []).map((col, idx) => {
                  const isPK = selectedTable.primary_keys?.includes(col.name);
                  const isFK = selectedTable.foreign_keys?.some(fk => fk.column === col.name);

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        isPK ? 'bg-amber-50 dark:bg-amber-900/10' : 
                        isFK ? 'bg-purple-50 dark:bg-purple-900/10' : 
                        'bg-gray-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4 flex-shrink-0">
                          {isPK && <Key className="w-3.5 h-3.5 text-amber-500" />}
                          {isFK && !isPK && <Link2 className="w-3.5 h-3.5 text-purple-500" />}
                        </div>
                        <span className={`text-sm truncate ${
                          isPK ? 'text-amber-700 dark:text-amber-400 font-medium' : 
                          isFK ? 'text-purple-700 dark:text-purple-400 font-medium' : 
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {col.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-2 flex-shrink-0">
                        {col.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {
}
            {selectedTable.foreign_keys?.length > 0 && (
              <div className="p-4 border-t border-gray-200/50 dark:border-white/10">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Foreign Keys ({selectedTable.foreign_keys.length})
                </h4>
                <div className="space-y-2">
                  {selectedTable.foreign_keys.map((fk, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                      <Link2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div className="text-xs text-purple-700 dark:text-purple-400 truncate">
                        <span className="font-medium">{fk.column}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1" />
                        <span>{fk.references_table || fk.referenced_table}.{fk.references_column || fk.referenced_column}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {
}
            {selectedTable.indexes?.length > 0 && (
              <div className="p-4 border-t border-gray-200/50 dark:border-white/10">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Indexes ({selectedTable.indexes.length})
                </h4>
                <div className="space-y-2">
                  {selectedTable.indexes.map((idx, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                      <Hash className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-400 truncate">
                        <span className="font-medium">{idx.name}</span>
                        <span className="text-blue-500 dark:text-blue-500 ml-1">
                          ({idx.columns?.join(', ') || '-'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SchemaDiagram;

