import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
} from '@xyflow/react'
import { PersonNode } from './components/PersonNode'
import { FloatingEdge } from './components/FloatingEdge'
import './App.css'

interface Person {
  id: string
  name: string
  isUser: boolean
  position?: { x: number; y: number }
}

interface Connection {
  id: string
  from: string
  to: string
}

interface AppData {
  people: Person[]
  connections: Connection[]
}

const STORAGE_KEY = 'bond-app-data'

const nodeTypes = {
  person: PersonNode,
}

const edgeTypes = {
  floating: FloatingEdge,
}

function App() {
  // Load from localStorage immediately during initialization
  const [data, setData] = useState<AppData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse stored data', e)
      }
    }
    return { people: [], connections: [] }
  })

  const [userName, setUserName] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [fromPersonId, setFromPersonId] = useState('')
  const [toPersonId, setToPersonId] = useState('')

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [connectionSource, setConnectionSource] = useState<string | null>(null)

  const user = data.people.find(p => p.isUser)

  // Handle node click for Shift+Click connections
  const handleNodeClick = useCallback((event: React.MouseEvent, nodeId: string) => {
    if (event.shiftKey) {
      if (!connectionSource) {
        // First shift+click - select source
        setConnectionSource(nodeId)
      } else if (connectionSource === nodeId) {
        // Clicked same node - deselect
        setConnectionSource(null)
      } else {
        // Second shift+click - create connection
        const exists = data.connections.some(
          c =>
            (c.from === connectionSource && c.to === nodeId) ||
            (c.from === nodeId && c.to === connectionSource)
        )

        if (!exists) {
          const newConnection: Connection = {
            id: crypto.randomUUID(),
            from: connectionSource,
            to: nodeId,
          }

          setData(prev => ({
            ...prev,
            connections: [...prev.connections, newConnection],
          }))
        }
        setConnectionSource(null)
      }
    }
  }, [connectionSource, data.connections])

  // Sync data changes to nodes and edges
  useEffect(() => {
    // Convert people to nodes
    const newNodes = data.people.map(person => ({
      id: person.id,
      type: 'person',
      position: person.position || { x: 250, y: 200 },
      data: {
        name: person.name,
        isUser: person.isUser,
        onRemove: removePerson,
        onClick: handleNodeClick,
        isConnectionSource: connectionSource === person.id,
      },
    }))
    setNodes(newNodes)

    // Convert connections to edges
    const newEdges = data.connections.map(conn => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      type: 'floating',
      style: { strokeWidth: 2, stroke: '#64748b' },
    }))
    setEdges(newEdges)
  }, [data, connectionSource, handleNodeClick])

  const addUser = () => {
    if (!userName.trim()) return

    const newUser: Person = {
      id: crypto.randomUUID(),
      name: userName.trim(),
      isUser: true,
      position: { x: 250, y: 200 },
    }

    setData({ people: [newUser], connections: [] })
    setUserName('')
  }

  const addPerson = () => {
    if (!newPersonName.trim()) return

    const newPerson: Person = {
      id: crypto.randomUUID(),
      name: newPersonName.trim(),
      isUser: false,
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      },
    }

    setData(prev => ({
      ...prev,
      people: [...prev.people, newPerson],
    }))
    setNewPersonName('')
  }

  const addConnection = () => {
    if (!fromPersonId || !toPersonId) return
    if (fromPersonId === toPersonId) return

    // Check if connection already exists
    const exists = data.connections.some(
      c =>
        (c.from === fromPersonId && c.to === toPersonId) ||
        (c.from === toPersonId && c.to === fromPersonId)
    )

    if (exists) return

    const newConnection: Connection = {
      id: crypto.randomUUID(),
      from: fromPersonId,
      to: toPersonId,
    }

    setData(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }))
    setFromPersonId('')
    // Keep toPersonId selected for easier consecutive connections
  }

  const removePerson = (id: string) => {
    setData(prev => ({
      people: prev.people.filter(p => p.id !== id),
      connections: prev.connections.filter(c => c.from !== id && c.to !== id),
    }))
  }

  const removeConnection = (id: string) => {
    setData(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== id),
    }))
  }

  const getPersonName = (id: string) => {
    return data.people.find(p => p.id === id)?.name || 'Unknown'
  }

  const resetData = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      setData({ people: [], connections: [] })
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Handle node changes (including position updates from dragging)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))

      // Save position changes back to our data for persistence
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && 'position' in c && c.position
      )
      if (positionChanges.length > 0) {
        setData((prev) => ({
          ...prev,
          people: prev.people.map((person) => {
            const change = positionChanges.find((c) => c.id === person.id)
            if (change && change.type === 'position' && 'position' in change && change.position) {
              return { ...person, position: change.position }
            }
            return person
          }),
        }))
      }
    },
    []
  )

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    []
  )

  // Handle new connections created by dragging
  const onConnect = useCallback(
    (connection: any) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      // Check if connection already exists
      const exists = data.connections.some(
        c =>
          (c.from === connection.source && c.to === connection.target) ||
          (c.from === connection.target && c.to === connection.source)
      )

      if (exists) return

      const newConnection: Connection = {
        id: crypto.randomUUID(),
        from: connection.source,
        to: connection.target,
      }

      setData(prev => ({
        ...prev,
        connections: [...prev.connections, newConnection],
      }))
    },
    [data.connections]
  )

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex flex-col gap-4">
      {!user ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              Welcome! What's your name?
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUser()}
                placeholder="Your name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={addUser}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Network Graph */}
          <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
            </ReactFlow>
          </div>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Add Person */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPerson()}
                  placeholder="Add person..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addPerson}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Create Connection */}
            {data.people.length > 1 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex gap-2 items-center">
                  <select
                    value={fromPersonId}
                    onChange={e => setFromPersonId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select person</option>
                    {data.people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isUser ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400">↔</span>
                  <select
                    value={toPersonId}
                    onChange={e => setToPersonId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select person</option>
                    {data.people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isUser ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addConnection}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App
