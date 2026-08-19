# Real-Time Collaborative Canvas - Backend Service

> Go Gin REST API and WebSocket server for real-time collaborative canvas application

## 📋 Overview

The backend service powers the Real-Time Collaborative Canvas application, providing REST API endpoints for room management, user authentication, canvas object operations, and WebSocket-based real-time communication. Built with Go and Gin framework, it features PostgreSQL for persistence, Redis for session management and pub/sub, and WebSocket for live collaboration.

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ HTTP/WebSocket Clients │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ API Layer (Gin Router) │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Auth Routes │ │ Room Routes │ │ Canvas Routes │ │
│ │ /auth/* │ │ /rooms/* │ │ /rooms/:id/objects/*│ │
│ └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Middleware Layer │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ CORS │ │ Auth │ │ Logging │ │
│ └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Service Layer │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ UserService │ │ RoomService │ │ CanvasService │ │
│ └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Repository Layer │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ PostgreSQL │ │ Redis │ │ WebSocket Hub │ │
│ │ (GORM) │ │ (go-redis) │ │ (gorilla/websocket)│ │
│ └─────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ Data Storage Layer │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ PostgreSQL │ │ Redis │ │
│ │ (Primary) │ │ (Cache) │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### 🔐 Authentication
- **User Registration** – Create new user accounts with email and password
- **User Login** – Authenticate with username and password
- **Guest Login** – Anonymous access with username
- **JWT Tokens** – Stateless authentication with bearer tokens
- **Session Management** – Redis-based session storage

### 🏠 Room Management
- **Create Rooms** – Public or private rooms with invite codes
- **Join Rooms** – Join existing rooms by ID or invite code
- **Leave Rooms** – Remove yourself from a room
- **Delete Rooms** – Room owners can delete rooms
- **Room Members** – View all users in a room
- **Role System** – Owner and editor roles

### 🎨 Canvas Operations
- **Object CRUD** – Create, read, update, delete canvas objects
- **Batch Operations** – Create/delete multiple objects at once
- **Object Versioning** – Track changes with version numbers
- **Object Types** – Text, shapes, images, sticky notes, audio
- **Position & Size** – Full position, rotation, and z-index support

### 🔌 Real-time Communication
- **WebSocket Hub** – Manage WebSocket connections
- **Room Broadcasting** – Real-time message distribution
- **User Presence** – Track active users in rooms
- **Cursor Tracking** – Real-time cursor position sharing
- **Typing Indicators** – Show when users are typing

### 📊 Data Storage
- **PostgreSQL** – Primary database with GORM ORM
- **Redis** – Session storage, pub/sub, and rate-limit counters
- **Migrations** – Version-controlled schema migrations (`golang-migrate`, applied automatically on startup)
- **Soft Delete** – Data retention with deleted_at

### 📎 Media Uploads
- **Pluggable storage backend** – S3 (via AWS SDK v2, also works against S3-compatible services like MinIO/R2) when `S3_BUCKET` is set, otherwise local disk served from `/uploads`
- **Size-limited** – configurable max upload size (`MEDIA_MAX_UPLOAD_MB`)

### 🛡️ Rate Limiting
- **Redis-backed sliding window** – auth endpoints limited per-IP (20 req/min); all other API routes limited per authenticated user (300 req/min)

### 🕰️ Offline / Time-Travel Sync
- **Sync events log** – every canvas mutation is recorded with a monotonic version, so a reconnecting or offline client can fetch and replay everything it missed

## 📁 Project Structure
```
real-time-canvas-service/
├── api/
│   └── routes.go                # HTTP route definitions
├── cmd/api/
│   └── main.go                  # Application entry point (wiring + startup)
├── internal/
│   ├── config/
│   │   ├── config.go            # Configuration loading
│   │   ├── database.go          # Database connections
│   │   └── migrate.go           # Migration runner (runs on startup)
│   ├── handlers/
│   │   ├── auth_handler.go      # Register/login/guest/profile
│   │   ├── room_handler.go      # Room management endpoints
│   │   ├── canvas_handler.go    # Canvas object endpoints
│   │   ├── sync_handler.go      # Sync event log endpoints
│   │   ├── media_handler.go     # Media upload endpoint
│   │   └── websocket_handler.go # WebSocket connection handler
│   ├── middleware/
│   │   ├── auth.go              # JWT authentication
│   │   ├── cors.go              # CORS configuration
│   │   ├── logging.go           # Request logging
│   │   └── ratelimit.go         # Redis-backed rate limiting (per-IP / per-user)
│   ├── models/
│   │   ├── dto/                 # Request/response DTOs (user, room, canvas, sync)
│   │   ├── user.go               # User model
│   │   ├── room.go               # Room model
│   │   ├── room_user.go          # Room membership model
│   │   ├── canvas_object.go      # Canvas object model
│   │   └── sync_event.go         # Sync event model
│   ├── repository/
│   │   ├── postgres/            # user, room, canvas, sync repositories (GORM)
│   │   └── redis/               # session repository, pub/sub
│   ├── services/
│   │   ├── user_service.go
│   │   ├── room_service.go
│   │   ├── canvas_service.go     # Also records the sync-event log
│   │   ├── sync_service.go
│   │   ├── media_service.go
│   │   └── physics_service.go
│   ├── storage/
│   │   ├── storage.go            # Storage interface, picks backend by config
│   │   ├── local.go               # Local-disk backend (served at /uploads)
│   │   └── s3.go                  # S3 / S3-compatible backend
│   └── websocket/
│       ├── hub.go                 # Connection hub
│       ├── client.go              # Client read/write pumps
│       ├── message.go             # WebSocket message types
│       └── hub_stability_test.go  # Concurrency regression tests
├── migrations/
│   ├── 001_initial_schema.up.sql
│   └── 001_initial_schema.down.sql
├── pkg/
│   ├── database/                 # Postgres/Redis connection helpers
│   ├── jwt/                       # Token generation/validation (+ tests)
│   ├── redis/                     # Shared Redis service (rate limiting, pub/sub)
│   └── utils/                     # id_generator, validator
├── uploads/                       # Local media storage fallback (gitignored)
├── go.mod
├── go.sum
├── .env.example
└── .gitignore
```


## 🛠️ Technology Stack

- **Framework**: [Gin](https://github.com/gin-gonic/gin) – Web framework
- **Database**: [PostgreSQL](https://www.postgresql.org/) – Primary database
- **Cache**: [Redis](https://redis.io/) – Session management & pub/sub
- **ORM**: [GORM](https://gorm.io/) – Object-Relational Mapping
- **WebSocket**: [Gorilla WebSocket](https://github.com/gorilla/websocket) – Real-time communication
- **Migrations**: [golang-migrate](https://github.com/golang-migrate/migrate) – Schema versioning

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

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms/:id/events` | Record a sync event |
| GET | `/api/v1/rooms/:id/events` | Fetch missed events since a version (reconnect/replay) |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms/:id/media` | Upload an image/audio attachment (multipart field `file`) |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | WebSocket connection endpoint — pass the JWT as `?token=`, since the browser WebSocket API can't set an `Authorization` header on the upgrade request |

### Rate Limits
All `/api/v1/auth/*` routes are limited to 20 requests/minute per client IP. Every other `/api/v1` route (all of which require a Bearer JWT) is limited to 300 requests/minute per authenticated user. Both are enforced via Redis and shared across instances.

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

## 🚀 Getting Started

### Prerequisites

- **Go** >= 1.25
- **PostgreSQL** >= 15
- **Redis** >= 7

### Installation

```bash
# From the repo root
git clone https://github.com/Oluwaseyi89/real-time-canvas.git
cd real-time-canvas/real-time-canvas-service

# Install dependencies
go mod download

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Applies pending migrations, then starts the server on :8080
go run cmd/api/main.go

# — or build + run a standalone binary —
go build -o canvas-service ./cmd/api
./canvas-service
```

## Environment Variables
See [`.env.example`](./.env.example) for the full, current list with inline comments. The essentials:
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

# Redis (single connection URL, not separate host/port/password fields)
REDIS_URL=redis://localhost:6379

# CORS — comma-separated origins allowed to make credentialed requests
ALLOWED_ORIGINS=http://localhost:3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Media uploads — leave S3_BUCKET empty to fall back to local disk storage
S3_BUCKET=
LOCAL_UPLOAD_DIR=./uploads
LOCAL_UPLOAD_BASE_URL=http://localhost:8080/uploads
MEDIA_MAX_UPLOAD_MB=15
```

## Database Migrations
Migrations run automatically on every startup via `internal/config/migrate.go` — `go run cmd/api/main.go` is all you need. To run them independently instead:
```bash
migrate -database "postgres://user:pass@localhost:5432/db?sslmode=disable" -path migrations up
```

## ✅ Quality & CI

```bash
go build ./...              # compile everything
go vet ./...                 # static analysis
go test ./... -race -cover   # unit tests, race detector on
golangci-lint run ./...      # lint (install: https://golangci-lint.run/welcome/install/)
```

All four run in [`real-time-canvas-service-ci.yml`](../.github/workflows/real-time-canvas-service-ci.yml) on every PR that touches this directory, and all four are **required** to pass — the codebase is currently clean on all of them, so please keep it that way rather than introducing new lint findings or dropped error checks.

The existing test suite (`pkg/jwt`, `internal/websocket`) is unit-level only and needs no database — it runs the same way in CI as it does locally. There's no integration-test setup against real PostgreSQL/Redis yet; that would be a valuable contribution.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run the commands in [Quality & CI](#-quality--ci) locally
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request — CI will run automatically against it

## 📄 License

No license file is currently published for this repository, so default copyright applies (all rights reserved) — see the [root README](../README.md) for the canonical statement. If you're the maintainer and intend this to be open-source under a specific license, add a `LICENSE` file at the repo root.

## 🙏 Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) – Web framework
- [GORM](https://gorm.io/) – ORM library
- [Gorilla WebSocket](https://github.com/gorilla/websocket) – WebSocket library
- [golang-migrate](https://github.com/golang-migrate/migrate) – Migration tool
- [go-redis](https://github.com/redis/go-redis) – Redis client

---

**Made with ❤️ by the Collaborative Canvas Team**