# Infinite Canvas

Real-time collaborative whiteboard with physics, offline sync, and time travel

[![real-time-canvas-web CI](https://github.com/Oluwaseyi89/real-time-canvas/actions/workflows/real-time-canvas-web-ci.yml/badge.svg)](https://github.com/Oluwaseyi89/real-time-canvas/actions/workflows/real-time-canvas-web-ci.yml)
[![real-time-canvas-service CI](https://github.com/Oluwaseyi89/real-time-canvas/actions/workflows/real-time-canvas-service-ci.yml/badge.svg)](https://github.com/Oluwaseyi89/real-time-canvas/actions/workflows/real-time-canvas-service-ci.yml)

## 📋 Overview
Infinite Canvas is a full-stack collaborative workspace that enables multiple users to create, manipulate, and interact with content on an infinite 2D surface in real-time. Built for hackathons and creative collaboration, it combines advanced whiteboard features with physics simulations, offline capabilities, and session replay.

The platform consists of two independently deployable apps, each with its own README:

- **[`real-time-canvas-web/`](./real-time-canvas-web)** — Next.js 16 with React 19, Fabric.js, Matter.js, and WebSocket
- **[`real-time-canvas-service/`](./real-time-canvas-service)** — Go with Gin framework, PostgreSQL, Redis, and Gorilla WebSocket

There is no root `package.json`/workspace tooling tying them together — each has its own dependency graph and lockfile, and is built/tested independently (see [CI](#-continuous-integration) below).

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
| Next.js 16 (App Router, Turbopack) | React framework |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling and design system |
| Fabric.js v6 | Canvas rendering and object management |
| Matter.js | Physics simulation engine |
| Yjs | CRDT-based real-time collaboration |
| Zustand | State management |
| WebSocket | Real-time communication |
| IndexedDB (via localforage) | Offline operation queue |
| ESLint (`eslint-config-next`) | Linting |

### Backend
| Technology | Purpose |
|------------|---------|
| Go 1.25+ | Backend language |
| Gin | Web framework |
| PostgreSQL 15+ | Primary database |
| Redis 7+ | Session management, pub/sub & rate limiting |
| GORM | ORM library |
| Gorilla WebSocket | WebSocket implementation |
| golang-migrate | Database migrations |
| go-redis | Redis client |
| AWS SDK v2 (S3) | Optional media storage backend (falls back to local disk) |
| JWT | Authentication |
| golangci-lint | Linting |

## 📁 Project Structure

### Frontend Structure
```
real-time-canvas-web/
├── app/                         # Next.js App Router
│   ├── (auth)/login/           # Login page
│   ├── (canvas)/               # Canvas workspace
│   │   ├── page.tsx            # Room launcher dashboard
│   │   └── room/[roomId]/      # Individual canvas room
│   ├── api/                    # Route handlers (NextAuth, room proxying)
│   ├── providers/              # Context providers
│   └── layout.tsx              # Root layout
├── components/
│   ├── canvas/
│   │   ├── InfiniteCanvas/     # Core canvas (Core/Events/Renderer split)
│   │   ├── tools/              # Toolbar + Text/Shape/Image/StickyNote/Pencil/Audio tools
│   │   ├── objects/            # Fabric object wrappers (Shape/Text/Sticky/Image/Audio)
│   │   ├── dock/                # Dockable tool rail + color palette
│   │   ├── minimap/             # Radar minimap
│   │   ├── physics/             # Physics engine + Matter.js bridge + controls
│   │   ├── ZoomControls.tsx
│   │   └── TimeTravelControls.tsx
│   ├── collaboration/          # Presence, cursors, typing indicators
│   ├── room/                   # Room list/invite/info/create/join dialogs
│   ├── export/                 # PNG/SVG/JSON exporters
│   └── ui/                     # Shared primitives (Button, Modal, Toast, ...)
├── hooks/                      # useCanvas, useWebSocket, usePhysics, useOfflineSync,
│                                # useTimeTravel, useRoom, useAuth, useCollaboration,
│                                # useMinimap, useZoomPan
├── lib/
│   ├── canvas/                 # Fabric config, renderer, object factory, minimap renderer
│   ├── websocket/               # WebSocket client, message handlers, event types
│   ├── offline/                 # IndexedDB, queue manager, sync engine
│   ├── time-travel/             # Event store + replay engine
│   ├── physics/                 # Matter.js physics engine
│   ├── yjs/                     # CRDT collaboration (crdt/sync/provider)
│   ├── theme/                   # Theme provider (light/dark)
│   ├── api/                     # REST client
│   └── utils/                   # coordinates, debounce, uuid
├── store/                      # Zustand stores: canvas, collaboration, drawing, export,
│                                # history, minimap, room, auth, user, websocket
├── types/                      # TypeScript type definitions
├── config/                     # Constants & environment config
├── public/                     # Static assets
├── eslint.config.mjs
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
│   └── routes.go                   # HTTP route definitions
├── cmd/api/
│   └── main.go                     # Application entry point (wiring + startup)
├── internal/
│   ├── config/                     # Config loading, DB connections, migration runner
│   ├── handlers/                   # auth, room, canvas, sync, media, websocket
│   ├── middleware/                 # auth (JWT), cors, logging, ratelimit (Redis-backed)
│   ├── models/                     # user, room, room_user, canvas_object, sync_event
│   │   └── dto/                    # Request/response DTOs
│   ├── repository/
│   │   ├── postgres/               # user, room, canvas, sync repositories (GORM)
│   │   └── redis/                  # session repository, pub/sub
│   ├── services/                   # user, room, canvas, sync, media, physics
│   ├── storage/                    # Pluggable media storage: local disk or S3
│   └── websocket/                  # hub, client, message types (+ hub concurrency tests)
├── migrations/                     # golang-migrate SQL migrations
├── pkg/
│   ├── database/                   # Postgres/Redis connection helpers
│   ├── jwt/                        # Token generation/validation (+ tests)
│   ├── redis/                      # Shared Redis service (rate limiting, pub/sub)
│   └── utils/                      # id_generator, validator
├── uploads/                        # Local media storage fallback (gitignored)
├── go.mod
├── go.sum
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

**Frontend:**
- Node.js 22+
- npm (the repo ships a `package-lock.json`, so use `npm ci`/`npm install`)

**Backend:**
- Go 1.25+
- PostgreSQL 15+
- Redis 7+

### Installation
```bash
# Clone the repository
git clone https://github.com/Oluwaseyi89/real-time-canvas.git
cd real-time-canvas

# ─── Frontend Setup ───
cd real-time-canvas-web
npm install

cp .env.example .env

# ─── Backend Setup ───
cd ../real-time-canvas-service
go mod download
cp .env.example .env

# Edit .env with your PostgreSQL and Redis credentials
nano .env
```

## Environment Variables
See each app's own README for the full, current list — [`real-time-canvas-web/.env.example`](./real-time-canvas-web/.env.example) and [`real-time-canvas-service/.env.example`](./real-time-canvas-service/.env.example) are the source of truth. At minimum:

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
REDIS_URL=redis://localhost:6379

# CORS — comma-separated origins allowed to make credentialed requests
ALLOWED_ORIGINS=http://localhost:3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Media uploads — leave S3_BUCKET empty to use local disk storage instead
S3_BUCKET=
LOCAL_UPLOAD_DIR=./uploads
LOCAL_UPLOAD_BASE_URL=http://localhost:8080/uploads
MEDIA_MAX_UPLOAD_MB=15
```

## Running the Application
```bash
# ─── Backend ───
cd real-time-canvas-service

# Applies pending migrations on startup, then serves on :8080
go run cmd/api/main.go

# ─── Frontend ───
cd ../real-time-canvas-web

# Development mode
npm run dev

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

### Sync & Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms/:id/events` | Record a sync event (time-travel/offline replay log) |
| GET | `/api/v1/rooms/:id/events` | Fetch missed events since a version, for reconnect/replay |
| POST | `/api/v1/rooms/:id/media` | Upload an image/audio attachment (local disk or S3) |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | WebSocket connection endpoint (auth via `?token=` query param) |

All routes above `/api/v1/auth/*` require a `Bearer` JWT. Auth endpoints are rate-limited per IP (20 req/min); all other `/api/v1` routes are rate-limited per authenticated user (300 req/min), backed by Redis.

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

## ✅ Continuous Integration

Each app has its own workflow under [`.github/workflows/`](./.github/workflows), scoped to only run when that app's files change:

- **[`real-time-canvas-web-ci.yml`](./.github/workflows/real-time-canvas-web-ci.yml)** — installs, type-checks (`tsc --noEmit`), builds (`next build`), and runs ESLint. Lint currently reports rather than blocks — see [`real-time-canvas-web/README.md`](./real-time-canvas-web/README.md#-quality--ci) for why.
- **[`real-time-canvas-service-ci.yml`](./.github/workflows/real-time-canvas-service-ci.yml)** — builds, vets, runs the test suite with the race detector, and runs `golangci-lint` as a required check.

Run the same checks locally before pushing — see the **Quality & CI** section in each app's README for exact commands.

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run the relevant app's lint/type-check/build/test commands locally (see its README)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request — CI will run automatically against it

## 📄 License

No `LICENSE` file is currently published for this repository, so default copyright applies (all rights reserved) unless/until the maintainer adds one.

