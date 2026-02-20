
import { MarkerType } from '@xyflow/react';

const calculateNodePositions = (tables) => {
  const positions = {};
  const columns = 3; // Number of columns in grid
  const horizontalSpacing = 350;
  const verticalSpacing = 400;

  tables.forEach((table, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    positions[table.name] = {
      x: col * horizontalSpacing,
      y: row * verticalSpacing
    };
  });

  return positions;
};

export const calculateHierarchicalLayout = (tables) => {
  const positions = {};
  const columns = 3;
  const horizontalSpacing = 350;
  const verticalSpacing = 400;

  const depths = new Map();
  tables.forEach(table => {
    const fkCount = table.foreign_keys?.length || 0;
    depths.set(table.name, fkCount);
  });

  const sortedTables = [...tables].sort((a, b) => {
    const depthA = depths.get(a.name);
    const depthB = depths.get(b.name);
    return depthA - depthB;
  });

  sortedTables.forEach((table, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    positions[table.name] = {
      x: col * horizontalSpacing,
      y: row * verticalSpacing
    };
  });

  return positions;
};

export const mapTablesToNodes = (tables, useHierarchicalLayout = false) => {
  if (!tables || !Array.isArray(tables)) {
    return [];
  }

  const positions = useHierarchicalLayout 
    ? calculateHierarchicalLayout(tables)
    : calculateNodePositions(tables);

  return tables.map((table, idx) => ({
    id: table.name,
    type: 'tableNode',
    position: positions[table.name],
    data: {
      name: table.name,
      type: table.type,
      columns: table.columns || table.fields || [],
      primary_keys: table.primary_keys || [],
      foreign_keys: table.foreign_keys || [],
      row_count: table.row_count,
      document_count: table.document_count,
      indexes: table.indexes || [],
      colorIndex: table.colorIndex ?? idx
    },
    draggable: true
  }));
};

export const mapForeignKeysToEdges = (tables) => {
  if (!tables || !Array.isArray(tables)) {
    return [];
  }

  const edges = [];

  tables.forEach(table => {
    if (!table.foreign_keys || !Array.isArray(table.foreign_keys)) {
      return;
    }

    table.foreign_keys.forEach((fk, index) => {
      const targetTable = fk.references_table || fk.referenced_table;
      const targetColumn = fk.references_column || fk.referenced_column;

      if (!targetTable || !targetColumn) {
        return;
      }

      edges.push({
        id: `${table.name}-${targetTable}-${index}`,
        source: table.name,
        target: targetTable,
        sourceHandle: fk.column,
        targetHandle: targetColumn,
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#a855f7', 
          strokeWidth: 2 
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#a855f7',
          width: 15,
          height: 15
        }
      });
    });
  });

  return edges;
};

export const mapSchemaToFlow = (schema, options = {}) => {
  const {
    useHierarchicalLayout = false,
    includeMetadata = true
  } = options;

  const tables = schema.tables || schema.collections || [];

if (!schema || tables.length === 0) {
  return { 
    nodes: [], 
    edges: [],
    metadata: null
  };
}

const nodes = mapTablesToNodes(tables, useHierarchicalLayout);
const edges = mapForeignKeysToEdges(tables);

  const metadata = includeMetadata ? {
  database_name: schema.database_name,
  database_type: schema.database_type,
  table_count: tables.length,
  relationship_count: edges.length,
  total_columns: tables.reduce((sum, t) => sum + ((t.columns || t.fields)?.length || 0), 0),
  total_rows: tables.reduce((sum, t) => sum + (t.row_count || t.document_count || 0), 0)
} : null;

  return { nodes, edges, metadata };
};

export const validateSchema = (schema) => {
  const errors = [];

  if (!schema) {
    errors.push('Schema is null or undefined');
    return { valid: false, errors };
  }

  if (!schema.tables || !Array.isArray(schema.tables)) {
    errors.push('Schema missing or invalid "tables" array');
    return { valid: false, errors };
  }

  schema.tables.forEach((table, index) => {
    if (!table.name) {
      errors.push(`Table at index ${index} missing "name"`);
    }
    if (!table.columns || !Array.isArray(table.columns)) {
      errors.push(`Table "${table.name}" missing "columns" array`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

export const exportDiagram = (nodes, edges, metadata) => {
  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    metadata,
    nodes: nodes.map(node => ({
      id: node.id,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label
    }))
  };
};

export const filterTablesByName = (tables, searchTerm) => {
  if (!searchTerm) return tables;
  
  const term = searchTerm.toLowerCase();
  return tables.filter(table => 
    table.name.toLowerCase().includes(term)
  );
};

export const getEdgeColor = (databaseType) => {
  const colors = {
    mysql: '#3b82f6',
    postgresql: '#336791',
    sqlite: '#003b57',
    mongodb: '#47a248'
  };

  return colors[databaseType?.toLowerCase()] || '#3b82f6';
};
