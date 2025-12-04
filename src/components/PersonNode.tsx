import { Handle, Position, NodeProps } from '@xyflow/react'

interface PersonNodeData {
  name: string
  isUser: boolean
  onRemove?: (id: string) => void
}

export function PersonNode({ id, data }: NodeProps<PersonNodeData>) {
  const { name, isUser, onRemove } = data

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
          px-6 py-4 rounded-lg shadow-lg border-2 transition-all
          ${isUser
            ? 'bg-blue-500 text-white border-blue-600 min-w-32'
            : 'bg-white text-gray-800 border-gray-300 min-w-28 hover:border-blue-400'
          }
        `}
      >
        <div className="text-center font-medium">
          {name}
        </div>
      </div>

      {!isUser && onRemove && (
        <button
          onClick={() => onRemove(id)}
          className="
            absolute -top-2 -right-2
            bg-red-500 text-white rounded-full w-6 h-6
            opacity-0 group-hover:opacity-100 transition-opacity
            hover:bg-red-600 flex items-center justify-center
            text-sm font-bold
          "
          title="Remove person"
        >
          ×
        </button>
      )}
    </div>
  )
}
