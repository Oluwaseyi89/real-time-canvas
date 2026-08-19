# Infinite Canvas

A real-time collaborative whiteboard with physics, offline sync, and time travel.

## 🎯 Overview
Infinite Canvas is a high-performance collaborative workspace that enables multiple users to create, manipulate, and interact with content on an infinite 2D surface in real-time. Built for hackathons and creative collaboration, it combines advanced whiteboard features with physics simulations and offline capabilities.

## ✨ Features

### Core Features
- **Real-time Collaboration**: Multi-user sessions with live cursor tracking and presence
- **Infinite Canvas**: Smooth zoom, pan, and infinite scrolling with 100+ objects
- **Rich Content Tools**: Text, shapes, images, sticky notes, and audio recording
- **Guest Authentication**: Simple username-based login without sign-up requirements
- **Responsive Design**: Works seamlessly across desktop and mobile

### Advanced Technical Features
- **Physics Engine**: Objects with gravity, collisions, attraction/repulsion (Matter.js)
- **Mini-map + Radar**: Real-time location tracking of collaborators
- **Offline Support**: Queue operations and sync when back online
- **Time Travel**: Replay entire session from beginning
- **Export Options**: PNG, SVG, and JSON formats

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend Architecture                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Presentation Layer                       │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │  │
│  │  │    Pages     │ │  Components  │ │   Layouts    │      │  │
│  │  │  (App Dir)   │ │  (Reusable)  │ │  (Structure) │      │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                     Logic Layer                             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │  │
│  │  │    Hooks     │ │   Stores     │ │   Services   │      │  │
│  │  │   (Custom)   │ │   (Zustand)  │ │   (Libs)     │      │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Integration Layer                        │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │  │
│  │  │  Fabric.js   │ │  Matter.js   │ │   Yjs        │      │  │
│  │  │  (Canvas)    │ │  (Physics)   │ │   (CRDT)     │      │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │  │
│  │  │  IndexedDB   │ │  WebSocket   │ │   REST API   │      │  │
│  │  │  (Offline)   │ │  (Live)      │ │   (HTTP)     │      │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Flow Diagram                          │
│                                                                     │
│  User Action ──► Component ──► Hook/Store ──► Service/API          │
│      │                                       │                      │
│      │                                       ▼                      │
│      │                              ┌────────────────┐             │
│      │                              │  HTTP Request  │             │
│      │                              │  WebSocket     │             │
│      │                              └────────────────┘             │
│      │                                       │                      │
│      │                                       ▼                      │
│      │                              ┌────────────────┐             │
│      │                              │   Backend      │             │
│      │                              │   Processing   │             │
│      │                              └────────────────┘             │
│      │                                       │                      │
│      │                                       ▼                      │
│      │                              ┌────────────────┐             │
│      │                              │   Broadcast   │             │
│      │                              │   to Others   │             │
│      │                              └────────────────┘             │
│      │                                       │                      │
│      │                                       ▼                      │
│      └───────────────────────────────► ┌────────────────┐          │
│                                         │   Update UI    │          │
│                                         │   (Realtime)   │          │
│                                         └────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend Framework:**
- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4

**Core Libraries:**
- Fabric.js v6 – Canvas rendering and object management
- Matter.js – Physics simulation
- Yjs – CRDT-based real-time collaboration
- Zustand – State management
- WebSocket – Real-time communication

**Storage:**
- IndexedDB (via localforage) – Offline operation queue
- Session Storage – User identity

**Quality tooling:**
- ESLint (`eslint-config-next`, flat config) – linting
- TypeScript compiler (`tsc --noEmit`) – type-checking

### Project Structure
```
real-time-canvas-web/
├── app/                     # Next.js App Router pages
│   ├── (auth)/login/       # Login page
│   ├── (canvas)/           # Canvas workspace routes
│   │   ├── page.tsx        # Room launcher dashboard
│   │   └── room/[roomId]/  # Individual canvas room
│   ├── api/                # Route handlers (NextAuth, room proxying)
│   └── providers/          # Context providers
├── components/
│   ├── canvas/
│   │   ├── InfiniteCanvas/ # Core canvas (Core/Events/Renderer split)
│   │   ├── tools/          # Toolbar + Text/Shape/Image/StickyNote/Pencil/Audio tools
│   │   ├── objects/        # Fabric object wrappers
│   │   ├── dock/           # Dockable tool rail + color palette
│   │   ├── minimap/        # Radar minimap
│   │   └── physics/        # Physics engine, Matter.js bridge, controls
│   ├── collaboration/      # Presence, cursors, typing indicators
│   ├── room/                # Room list/invite/info/create/join dialogs
│   ├── export/               # PNG/SVG/JSON exporters
│   └── ui/                   # Shared primitives (Button, Modal, Toast, ...)
├── hooks/                   # useCanvas, useWebSocket, usePhysics, useOfflineSync,
│                             # useTimeTravel, useRoom, useAuth, useCollaboration,
│                             # useMinimap, useZoomPan
├── lib/
│   ├── canvas/              # Fabric config, renderer, object factory, minimap renderer
│   ├── websocket/            # WebSocket client, message handlers, event types
│   ├── offline/               # IndexedDB, queue manager, sync engine
│   ├── time-travel/           # Event store + replay engine
│   ├── physics/                # Matter.js physics engine
│   ├── yjs/                    # CRDT collaboration (crdt/sync/provider)
│   ├── theme/                  # Theme provider (light/dark)
│   ├── api/                    # REST client
│   └── utils/                  # coordinates, debounce, uuid
├── store/                   # Zustand stores: canvas, collaboration, drawing, export,
│                             # history, minimap, room, auth, user, websocket
├── types/                   # TypeScript type definitions
├── config/                  # Constants & environment config
└── eslint.config.mjs
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- npm (the repo ships a `package-lock.json`)
- A running instance of [`real-time-canvas-service`](../real-time-canvas-service) (for the API/WebSocket backend)

### Installation
```bash
# From the repo root
git clone https://github.com/Oluwaseyi89/real-time-canvas.git
cd real-time-canvas/real-time-canvas-web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

## Environment Variables
```env
# Next.js Environment Variables
NEXT_PUBLIC_APP_NAME=Real-Time Collaborative Canvas
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## ✅ Quality & CI

```bash
npm run type-check   # tsc --noEmit
npm run lint         # eslint .
npm run build        # next build (also type-checks)
```

All three run in [`real-time-canvas-web-ci.yml`](../.github/workflows/real-time-canvas-web-ci.yml) on every PR that touches this directory. `type-check` and `build` are required to pass.

`lint` is currently **informational only** (`continue-on-error`): ESLint was only wired up alongside this CI workflow, and the existing codebase has pre-existing lint debt it surfaces (mostly `@typescript-eslint/no-explicit-any`, plus a couple of real `react-hooks/refs` findings worth looking at). Please don't add *new* lint errors in your changes, and feel free to clean up warnings you touch in passing — once the count reaches zero this step will flip to required.

There is currently no automated test suite for this app (no Jest/Vitest/Playwright config) — manual verification against a running backend is the only coverage. Contributions adding tests are very welcome.

## 🔧 Usage

### Login
- Enter a display name
- Optionally continue as a random guest
- No password required – identity is session-based

### Creating a Room
- Click **New Blank Canvas** on the dashboard
- Share the room URL or invite code with collaborators

### Joining a Room
- Click **Join via Code** or **URL**
- Paste a room link or enter a room ID
- Optionally provide an invite code for private rooms

### Canvas Controls
- **Pan**: Click and drag on empty space
- **Zoom**: Scroll or use zoom controls
- **Add Objects**: Use the floating toolbar (Text, Shapes, Images, Sticky Notes, Audio)
- **Physics**: Toggle physics engine, adjust gravity, and speed

### Collaboration Features
- **Live Cursors**: See other users' mouse positions
- **Typing Indicators**: See when others are typing
- **User Presence**: Avatar stack with online status
- **Minimap Radar**: Navigate to collaborators' locations

### Offline Mode
- Operations are queued when offline
- Automatic sync when connection is restored
- Visual indicators show sync status

### Time Travel
- Record canvas sessions
- Playback, pause, and seek through timeline
- Adjust playback speed (0.5x – 4x)
- Perfect for demonstrating workflows or debugging

### Export
- **PNG**: High-resolution raster image with background color options
- **SVG**: Scalable vector export
- **JSON**: Full canvas state backup with history

## 🎨 Design System

### Theme Colors
- **Background**: `#090d16` (Dark space)
- **Canvas Background**: `#0b0f19`
- **Primary**: `#6366f1` (Indigo)
- **Accent**: `#06b6d4` (Cyan)
- **Surface**: `rgba(15, 23, 42, 0.75)` (Glassmorphism)

### Glassmorphism
All panels use a consistent glassmorphism style with:
- `backdrop-blur` effects
- Subtle border opacity
- Shadow layers
- Smooth transitions

### Typography
- **Primary font**: System UI (SF Pro, Segoe UI)
- **Mono font**: For technical elements and code
- **Font sizes**: Scale from 10px to 48px

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Run `npm run type-check`, `npm run lint`, and `npm run build` locally (see [Quality & CI](#-quality--ci))
4. Commit changes with conventional commits
5. Push to the branch
6. Open a pull request