# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bond is a network/relationship graph builder that allows users to create and visualize connections between people. Built with React, TypeScript, Vite, and React Flow.

## Development Commands

```bash
pnpm dev      # Start development server (runs on http://localhost:5173 or next available port)
pnpm build    # Type check with tsc and build for production
pnpm lint     # Run ESLint
pnpm preview  # Preview production build
```

## Architecture

### State Management Pattern

The app uses a **dual-state architecture** to bridge React Flow's node/edge model with persistent application data:

1. **Application Data (`data` state)**: Source of truth stored in localStorage
   - `Person[]` - Contains id, name, isUser flag, and optional position
   - `Connection[]` - Contains id, from, to references
   - Persists via lazy initialization in useState and useEffect sync

2. **React Flow State (`nodes`/`edges`)**: Derived state for rendering
   - Nodes and edges are **computed from application data** in a useEffect
   - React Flow manages its own internal state via `applyNodeChanges` and `applyEdgeChanges`
   - Position changes flow back to application data for persistence

This separation allows React Flow to handle interactive features (dragging, panning) while maintaining a clean data model for localStorage.

### Connection Creation Methods

Users can create connections in three ways:

1. **Shift+Click**: Hold Shift and click two nodes sequentially
   - First click selects source (shows green ring via `isConnectionSource`)
   - Second click creates connection
   - Implemented via `handleNodeClick` callback passed to PersonNode

2. **Drag between handles**: React Flow's `onConnect` handler
   - Handles are invisible but present on nodes
   - Same validation as other methods

3. **Dropdown selectors**: Manual selection UI
   - Second dropdown persists selection after creating connection for rapid consecutive connections

All methods use bidirectional connection checking to prevent duplicates.

### React Flow Integration

**Custom Components:**
- `PersonNode` - Custom node with invisible handles, Shift+click support, hover-to-remove button
- `FloatingEdge` - Custom edge that dynamically calculates optimal connection points using geometric intersection
  - Uses `useInternalNode` to access node internals (position, dimensions)
  - Calculates intersection points between node boundaries
  - Determines edge position (top/right/bottom/left) based on geometry
  - Renders curved Bezier paths

**Key Integration Points:**
- `nodeTypes` and `edgeTypes` registered with ReactFlow component
- `onNodesChange` applies changes AND syncs positions back to data state
- `onEdgesChange` applies changes to edges state
- `onConnect` handles drag-created connections

### Styling

Uses **Tailwind CSS exclusively** - no custom CSS beyond imports. All styling via utility classes.

## localStorage Key

Data is persisted to `localStorage` under key: `'bond-app-data'`
