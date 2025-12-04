import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface PersonNodeData {
  name: string
  isUser: boolean
  onRemove?: (id: string) => void
  onClick?: (event: React.MouseEvent, id: string) => void
  isConnectionSource?: boolean
}

export function PersonNode({ id, data }: NodeProps) {
  const { name, isUser, onRemove, onClick, isConnectionSource } = data as unknown as PersonNodeData

  return (
    <div className="relative group">
      {/* Single invisible handle for floating edges */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />

      <div
        className={`
          px-3 py-2 rounded-lg shadow-lg border-2 transition-all text-sm cursor-pointer
          ${isConnectionSource
            ? 'ring-4 ring-green-400 ring-offset-2'
            : ''
          }
          ${isUser
            ? 'bg-blue-500 text-white border-blue-600 min-w-16'
            : 'bg-white text-gray-800 border-gray-300 min-w-14 hover:border-blue-400'
          }
        `}
        onClick={(e) => onClick?.(e, id)}
      >
        <div className="text-center font-medium">
          {name}
        </div>
      </div>

      {!isUser && onRemove && (
        <button
          onClick={() => onRemove(id)}
          className="
            absolute -top-1 -right-1
            bg-red-500 text-white rounded-full w-5 h-5
            opacity-0 group-hover:opacity-100 transition-opacity
            hover:bg-red-600 flex items-center justify-center
            text-xs font-bold
          "
          title="Remove person"
        >
          ×
        </button>
      )}
    </div>
  )
}
