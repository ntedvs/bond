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

  const user = data.people.find(p => p.isUser)

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
  }, [data])

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
    setToPersonId('')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Bond - Network Builder
        </h1>

        {!user ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
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
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-700">
                Hello, <span className="text-blue-600">{user.name}</span>!
              </h2>
              <button
                onClick={resetData}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset All Data
              </button>
            </div>

            {/* Network Graph */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '500px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
              </ReactFlow>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Add Person */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">
                  Add Person
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPerson()}
                    placeholder="Person's name"
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
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-700">
                    Create Connection
                  </h3>
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

            {/* Lists */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* People List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">
                  People ({data.people.length})
                </h3>
                <div className="space-y-2">
                  {data.people.map(person => (
                    <div
                      key={person.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-700">
                        {person.name}
                        {person.isUser && (
                          <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                            You
                          </span>
                        )}
                      </span>
                      {!person.isUser && (
                        <button
                          onClick={() => removePerson(person.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections List */}
              {data.connections.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-700">
                    Connections ({data.connections.length})
                  </h3>
                  <div className="space-y-2">
                    {data.connections.map(conn => (
                      <div
                        key={conn.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700">
                          {getPersonName(conn.from)} ↔ {getPersonName(conn.to)}
                        </span>
                        <button
                          onClick={() => removeConnection(conn.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
