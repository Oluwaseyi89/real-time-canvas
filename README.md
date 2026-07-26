# Infinite Canvas

Real-time collaborative whiteboard with physics, offline sync, and time travel

## 📋 Overview
Infinite Canvas is a full-stack collaborative workspace that enables multiple users to create, manipulate, and interact with content on an infinite 2D surface in real-time. Built for hackathons and creative collaboration, it combines advanced whiteboard features with physics simulations, offline capabilities, and session replay.

The platform consists of:

- **Frontend**: Next.js 15 with React 19, Fabric.js, Matter.js, and WebSocket
- **Backend**: Go with Gin framework, PostgreSQL, Redis, and Gorilla WebSocket

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

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  Next.js Frontend (React 19)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │  Canvas  │ │  Tools   │ │  Physics │ │  Time    │    │  │
│  │  │  Engine  │ │  Panel   │ │  Engine  │ │  Travel  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │  Minimap │ │  Offline │ │  Export  │ │  Real-   │    │  │
│  │  │  + Radar │ │   Sync   │ │  Module  │ │  time    │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│              ┌───────────────┴───────────────┐                   │
│              │                               │                   │
│              ▼                               ▼                   │
│      ┌───────────────┐               ┌───────────────┐          │
│      │  HTTP REST    │               │   WebSocket   │          │
│      │  (API Calls)  │               │   (Live Sync) │          │
│      └───────────────┘               └───────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Go + Gin)                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway Layer                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │   Auth   │ │  Rooms   │ │  Canvas  │ │  Users   │    │  │
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Service Layer                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │   Auth   │ │   Room   │ │  Canvas  │ │   Sync   │    │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
│                               ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Repository Layer                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Postgres │ │  Redis   │ │  GORM    │ │  WebSocket│   │  │
│  │  │  Repos   │ │  Repos   │ │  ORM     │ │  Hub     │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Data Storage Layer                            │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐  │
│  │       PostgreSQL            │ │           Redis             │  │
│  │  ┌─────────────────────┐    │ │  ┌─────────────────────┐    │  │
│  │  │  Users              │    │ │  │  Sessions           │    │  │
│  │  │  Rooms              │    │ │  │  Pub/Sub Channels   │    │  │
│  │  │  Canvas Objects     │    │ │  │  Room State Cache   │    │  │
│  │  │  Sync Events        │    │ │  │  User Presence      │    │  │
│  │  └─────────────────────┘    │ │  └─────────────────────┘    │  │
│  └─────────────────────────────┘ └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture
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

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Styling and design system |
| Fabric.js v6 | Canvas rendering and object management |
| Matter.js | Physics simulation engine |
| Yjs | CRDT-based real-time collaboration |
| Zustand | State management |
| WebSocket | Real-time communication |
| IndexedDB | Offline operation queue |

### Backend
| Technology | Purpose |
|------------|---------|
| Go 1.21+ | Backend language |
| Gin | Web framework |
| PostgreSQL 15+ | Primary database |
| Redis 7+ | Session management & pub/sub |
| GORM | ORM library |
| Gorilla WebSocket | WebSocket implementation |
| golang-migrate | Database migrations |
| go-redis | Redis client |
| JWT | Authentication |

## 📁 Project Structure

### Frontend Structure
```
real-time-canvas-web/
├── app/                         # Next.js App Router
│   ├── (auth)/                 # Authentication routes
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Auth layout
│   ├── (canvas)/               # Canvas workspace
│   │   ├── page.tsx            # Room launcher dashboard
│   │   ├── layout.tsx          # Canvas layout
│   │   └── room/[roomId]/      # Individual canvas room
│   │       ├── page.tsx        # Canvas room page
│   │       └── loading.tsx     # Loading state
│   ├── api/                    # API routes
│   ├── providers/              # Context providers
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
├── components/
│   ├── canvas/                 # Canvas components
│   │   ├── tools/              # Toolbar and tools
│   │   │   ├── Toolbar.tsx     # Main toolbar
│   │   │   ├── TextTool.tsx    # Text input
│   │   │   ├── ShapeTool.tsx   # Shape creation
│   │   │   ├── ImageTool.tsx   # Image upload
│   │   │   ├── StickyNoteTool.tsx
│   │   │   └── AudioTool.tsx   # Audio recording
│   │   ├── minimap/            # Radar & minimap
│   │   │   ├── Minimap.tsx
│   │   │   ├── Radar.tsx
│   │   │   └── UserIndicator.tsx
│   │   ├── physics/            # Physics controls
│   │   │   ├── PhysicsControls.tsx
│   │   │   ├── PhysicsEngine.ts
│   │   │   └── MatterBridge.ts
│   │   ├── ZoomControls.tsx    # Zoom controls
│   │   └── TimeTravelControls.tsx
│   ├── collaboration/           # Collaboration UI
│   │   ├── UserPresence.tsx
│   │   ├── CursorTracker.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── CollaborationStatus.tsx
│   ├── room/                   # Room management
│   │   ├── RoomList.tsx
│   │   ├── RoomInvite.tsx
│   │   ├── RoomInfo.tsx
│   │   ├── CreateRoomDialog.tsx
│   │   └── JoinRoomDialog.tsx
│   └── export/                 # Export functionality
│       ├── ExportModal.tsx
│       ├── PNGExporter.ts
│       ├── SVGExporter.ts
│       └── JSONExporter.ts
├── hooks/                      # Custom React hooks
│   ├── useCanvas.ts            # Canvas lifecycle
│   ├── useWebSocket.ts         # WebSocket connection
│   ├── usePhysics.ts           # Physics integration
│   ├── useOfflineSync.ts       # Offline queue
│   ├── useTimeTravel.ts        # Session replay
│   ├── useRoom.ts              # Room management
│   ├── useAuth.ts              # Authentication
│   ├── useCollaboration.ts     # Collaboration
│   ├── useMinimap.ts           # Minimap
│   └── useZoomPan.ts           # Zoom & pan
├── lib/                        # Core libraries
│   ├── canvas/                 # Fabric.js config & renderer
│   │   ├── fabricConfig.ts
│   │   ├── renderer.ts
│   │   ├── objectFactory.ts
│   │   └── MinimapRenderer.ts
│   ├── websocket/              # WebSocket client
│   │   ├── client.ts
│   │   ├── handlers.ts
│   │   └── events.ts
│   ├── offline/                # Offline sync
│   │   ├── indexDB.ts
│   │   ├── queueManager.ts
│   │   └── syncEngine.ts
│   ├── time-travel/            # Time travel engine
│   │   ├── EventStore.ts
│   │   └── TimeTravelEngine.ts
│   ├── physics/                # Physics engine
│   │   └── PhysicsEngine.ts
│   ├── yjs/                    # CRDT collaboration
│   │   ├── crdt.ts
│   │   ├── sync.ts
│   │   └── provider.ts
│   └── utils/                  # Utilities
│       ├── coordinates.ts
│       ├── debounce.ts
│       └── uuid.ts
├── store/                      # Zustand stores
│   ├── canvasStore.ts
│   ├── collaborationStore.ts
│   ├── websocketStore.ts
│   ├── roomStore.ts
│   ├── authStore.ts
│   ├── userStore.ts
│   ├── historyStore.ts
│   ├── minimapStore.ts
│   └── exportStore.ts
├── types/                      # TypeScript types
│   ├── canvas.ts
│   ├── canvas-objects.ts
│   ├── collaboration.ts
│   ├── websocket.ts
│   ├── room.ts
│   ├── physics.ts
│   ├── offline.ts
│   ├── time-travel.ts
│   └── export.ts
├── config/                     # Configuration
│   ├── constants.ts
│   └── env.ts
├── public/                     # Static assets
│   ├── images/
│   └── icons/
├── .env.example
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Backend Structure
```
real-time-canvas-service/
├── api/
│   └── routes.go               # HTTP route definitions
├── cmd/
│   └── api/
│       └── main.go             # Application entry point
├── internal/
│   ├── config/                 # Configuration
│   │   ├── config.go           # Config loading
│   │   ├── database.go         # Database connections
│   │   └── migrate.go          # Migration runner
│   ├── handlers/               # HTTP handlers
│   │   ├── auth_handler.go     # Authentication endpoints
│   │   ├── room_handler.go     # Room management
│   │   ├── canvas_handler.go   # Canvas operations
│   │   └── websocket_handler.go # WebSocket handler
│   ├── middleware/             # Middleware
│   │   ├── auth.go             # JWT authentication
│   │   ├── cors.go             # CORS configuration
│   │   └── logging.go          # Request logging
│   ├── models/                 # Data models
│   │   ├── dto/                # Data Transfer Objects
│   │   │   ├── user.go
│   │   │   ├── room.go
│   │   │   ├── canvas.go
│   │   │   └── sync.go
│   │   ├── user.go             # User model
│   │   ├── room.go             # Room model
│   │   ├── room_user.go        # Room membership
│   │   ├── canvas_object.go    # Canvas object
│   │   └── sync_event.go       # Sync event
│   ├── repository/             # Data repositories
│   │   ├── postgres/           # PostgreSQL repositories
│   │   │   ├── user_repo.go
│   │   │   ├── room_repo.go
│   │   │   └── canvas_repo.go
│   │   └── redis/              # Redis repositories
│   │       ├── session_repo.go
│   │       └── pubsub.go
│   ├── services/               # Business logic
│   │   ├── user_service.go
│   │   ├── room_service.go
│   │   ├── canvas_service.go
│   │   └── sync_service.go
│   └── websocket/              # WebSocket management
│       ├── hub.go              # Connection hub
│       ├── client.go           # Client handling
│       ├── message.go          # Message types
│       └── room_manager.go     # Room metadata
├── migrations/                 # Database migrations
│   ├── 001_initial_schema.up.sql
│   └── 001_initial_schema.down.sql
├── pkg/                        # Shared packages
│   ├── database/
│   │   ├── postgres.go
│   │   └── redis.go
│   └── utils/
│       ├── id_generator.go
│       └── validator.go
├── go.mod
├── go.sum
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

**Frontend:**
- Node.js 18+ or Bun
- npm or yarn or bun

**Backend:**
- Go 1.21+
- PostgreSQL 15+
- Redis 7+

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/infinite-canvas.git
cd infinite-canvas

# ─── Frontend Setup ───
cd real-time-canvas-web
npm install
# or
bun install

cp .env.example .env

# ─── Backend Setup ───
cd ../real-time-canvas-service
go mod download
cp .env.example .env

# Edit .env with your PostgreSQL and Redis credentials
nano .env
```

## Environment Variables
### Frontend (.env):
```env
NEXT_PUBLIC_APP_NAME=Infinite Canvas
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

### Backend (.env):
```env
ENVIRONMENT=development
PORT=8080

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=collaborative_canvas
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Running the Application
```bash
# ─── Backend ───
cd real-time-canvas-service

# Run migrations
go run cmd/api/main.go

# Start the server
go run cmd/api/main.go

# ─── Frontend ───
cd ../real-time-canvas-web

# Development mode
npm run dev
# or
bun dev

# Production build
npm run build
npm start
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/guest` | Guest login |
| GET | `/api/v1/auth/profile` | Get user profile |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms` | Create room |
| GET | `/api/v1/rooms` | Get user rooms |
| GET | `/api/v1/rooms/:id` | Get room by ID |
| PUT | `/api/v1/rooms/:id` | Update room |
| DELETE | `/api/v1/rooms/:id` | Delete room |
| POST | `/api/v1/rooms/:id/join` | Join room |
| POST | `/api/v1/rooms/:id/leave` | Leave room |
| GET | `/api/v1/rooms/:id/users` | Get room users |

### Canvas Objects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms/:id/objects` | Create object |
| GET | `/api/v1/rooms/:id/objects` | Get room objects |
| GET | `/api/v1/rooms/:id/objects/:objId` | Get object by ID |
| PUT | `/api/v1/rooms/:id/objects/:objId` | Update object |
| DELETE | `/api/v1/rooms/:id/objects/:objId` | Delete object |
| POST | `/api/v1/rooms/:id/objects/batch` | Batch create objects |
| POST | `/api/v1/rooms/:id/objects/clear` | Clear room objects |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | WebSocket connection endpoint |

## 🔐 WebSocket Events

### Client → Server
- `room:join` – Join a room
- `room:leave` – Leave a room
- `user:presence` – Update presence
- `user:cursor` – Update cursor position
- `user:typing` – Update typing status
- `object:create` – Create object
- `object:update` – Update object
- `object:delete` – Delete object
- `physics:*` – Physics events (throw, collision, attract, repel)

### Server → Client
- `connection:ack` – Connection acknowledgment
- `room:joined` – Room joined successfully
- `room:left` – Room left successfully
- `user:joined` – User joined room
- `user:left` – User left room
- `user:presence` – User presence update
- `user:cursor` – User cursor update
- `user:typing` – User typing status
- `object:create` – Object created
- `object:update` – Object updated
- `object:delete` – Object deleted
- `canvas:sync` – Canvas synchronization
- `physics:*` – Physics events

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

## 📈 Performance Considerations

### Frontend
- **Object Rendering**: Fabric.js handles 100+ objects efficiently with viewport culling
- **Physics**: Matter.js runs at 60fps with configurable gravity and time scale
- **WebSocket**: Binary message formats for efficient data transfer
- **Offline**: IndexedDB for operation queue with batched sync

### Backend
- **Database Indexes**: Optimized queries with proper indexing
- **Redis Caching**: Session and room state caching for fast retrieval
- **Connection Pooling**: Efficient database and Redis connection management
- **Horizontal Scaling**: WebSocket hubs can be scaled with Redis pub/sub

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


