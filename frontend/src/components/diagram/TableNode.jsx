
import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Link2, ChevronDown, ChevronRight, Hash, Type, Calendar, ToggleLeft, Binary, FileJson, Layers } from 'lucide-react';

const TABLE_COLORS = [
  { bg: 'from-blue-500 to-blue-600', ring: 'ring-blue-400', dot: 'bg-blue-500' },
  { bg: 'from-purple-500 to-purple-600', ring: 'ring-purple-400', dot: 'bg-purple-500' },
  { bg: 'from-teal-500 to-teal-600', ring: 'ring-teal-400', dot: 'bg-teal-500' },
  { bg: 'from-orange-500 to-orange-600', ring: 'ring-orange-400', dot: 'bg-orange-500' },
  { bg: 'from-pink-500 to-pink-600', ring: 'ring-pink-400', dot: 'bg-pink-500' },
  { bg: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
  { bg: 'from-indigo-500 to-indigo-600', ring: 'ring-indigo-400', dot: 'bg-indigo-500' },
  { bg: 'from-cyan-500 to-cyan-600', ring: 'ring-cyan-400', dot: 'bg-cyan-500' },
];

const getTypeIcon = (type) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('int') || t.includes('float') || t.includes('double') || t.includes('decimal') || t.includes('number')) {
    return <Hash className="w-3 h-3" />;
  }
  if (t.includes('varchar') || t.includes('text') || t.includes('char') || t.includes('string')) {
    return <Type className="w-3 h-3" />;
  }
  if (t.includes('date') || t.includes('time') || t.includes('timestamp')) {
    return <Calendar className="w-3 h-3" />;
  }
  if (t.includes('bool')) {
    return <ToggleLeft className="w-3 h-3" />;
  }
  if (t.includes('blob') || t.includes('binary') || t.includes('bytes')) {
    return <Binary className="w-3 h-3" />;
  }
  if (t.includes('json') || t.includes('object') || t.includes('array')) {
    return <FileJson className="w-3 h-3" />;
  }
  return <Layers className="w-3 h-3" />;
};

const TableNode = memo(({ data, selected }) => {
  const {
    name,
    type = 'TABLE',
    columns: rawColumns = [],
    primary_keys = [],
    foreign_keys = [],
    row_count,
    document_count,
    indexes = [],
    colorIndex = 0
  } = data;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const columns = rawColumns;
  const color = TABLE_COLORS[colorIndex % TABLE_COLORS.length];

  const isPrimaryKey = (columnName) => primary_keys.includes(columnName);
  const isForeignKey = (columnName) => foreign_keys.some(fk => fk.column === columnName);
  
  const getForeignKeyInfo = (columnName) => {
    const fk = foreign_keys.find(fk => fk.column === columnName);
    if (!fk) return null;
    return { 
      refTable: fk.references_table || fk.referenced_table,
      refColumn: fk.references_column || fk.referenced_column
    };
  };

  const getColumnHandleTop = (index) => {
    const headerHeight = 48;
    const columnHeight = 32;
    const halfColumn = 16;
    return headerHeight + (index * columnHeight) + halfColumn;
  };

  const displayColumns = isCollapsed ? [] : columns.slice(0, 15);
  const hasMoreColumns = columns.length > 15;

  return (
    <div 
      className={`
        relative group
        bg-white dark:bg-[#1e1e2e] rounded-xl shadow-xl 
        border-2 transition-all duration-200
        ${selected 
          ? `border-blue-500 ${color.ring} ring-2` 
          : 'border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'}
        min-w-[240px] max-w-[320px]
      `}
      style={{ overflow: 'visible' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {
}
      <Handle
        type="target"
        position={Position.Left}
        id={`${name}-left`}
        className={`!w-3 !h-3 !border-2 !border-white !rounded-full transition-all ${isHovered ? '!opacity-100 !bg-blue-500' : '!opacity-0'}`}
        style={{ top: '24px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${name}-right`}
        className={`!w-3 !h-3 !border-2 !border-white !rounded-full transition-all ${isHovered ? '!opacity-100 !bg-blue-500' : '!opacity-0'}`}
        style={{ top: '24px' }}
      />

      {
}
      {!isCollapsed && columns.map((column, idx) => (
        <div key={`handles-${column.name}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={column.name}
            className="!w-2 !h-2 !bg-purple-500 !border-0 !opacity-0 group-hover:!opacity-100"
            style={{ top: `${getColumnHandleTop(idx)}px`, left: '-4px' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={column.name}
            className="!w-2 !h-2 !bg-purple-500 !border-0 !opacity-0 group-hover:!opacity-100"
            style={{ top: `${getColumnHandleTop(idx)}px`, right: '-4px' }}
          />
        </div>
      ))}

      {
}
      <div 
        className={`bg-gradient-to-r ${color.bg} px-3 py-2.5 rounded-t-[10px] cursor-pointer`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/70 flex-shrink-0" />
            )}
            <h3 className="text-white font-semibold text-sm truncate" title={name}>
              {name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-white/70 text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded">
              {columns.length}
            </span>
          </div>
        </div>
      </div>

      {
}
      {!isCollapsed && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {columns.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-400 text-xs">
              No columns
            </div>
          ) : (
            <>
              {displayColumns.map((column, idx) => {
                const isPK = isPrimaryKey(column.name);
                const isFK = isForeignKey(column.name);
                const fkInfo = isFK ? getForeignKeyInfo(column.name) : null;

                return (
                  <div
                    key={idx}
                    className={`
                      flex items-center justify-between px-3 py-1.5 
                      hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
                      ${isPK ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                      ${isFK ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}
                    `}
                    style={{ height: '32px' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {
}
                      <div className="w-4 flex-shrink-0">
                        {isPK && <Key className="w-3.5 h-3.5 text-amber-500" />}
                        {isFK && !isPK && <Link2 className="w-3.5 h-3.5 text-purple-500" />}
                      </div>

                      {
}
                      <span 
                        className={`text-xs font-medium truncate ${
                          isPK ? 'text-amber-700 dark:text-amber-400' : 
                          isFK ? 'text-purple-700 dark:text-purple-400' : 
                          'text-gray-700 dark:text-gray-300'
                        }`}
                        title={fkInfo ? `→ ${fkInfo.refTable}.${fkInfo.refColumn}` : column.name}
                      >
                        {column.name}
                      </span>

                      {
}
                      {column.nullable && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">?</span>
                      )}
                    </div>

                    {
}
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-gray-400 dark:text-gray-500">
                        {getTypeIcon(column.type)}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[80px]" title={column.type}>
                        {column.type?.replace(/\(.+\)/, '')}
                      </span>
                    </div>
                  </div>
                );
              })}

              {
}
              {hasMoreColumns && (
                <div className="px-3 py-1.5 text-center">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    +{columns.length - 15} more columns
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {
}
      {!isCollapsed && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-700/50 rounded-b-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {primary_keys.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                  <Key className="w-3 h-3" />
                  {primary_keys.length}
                </span>
              )}
              {foreign_keys.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                  <Link2 className="w-3 h-3" />
                  {foreign_keys.length}
                </span>
              )}
              {indexes.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                  IDX {indexes.length}
                </span>
              )}
            </div>
            {(row_count !== undefined || document_count !== undefined) && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {(row_count || document_count || 0).toLocaleString()} rows
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TableNode.displayName = 'TableNode';

export default TableNode;

