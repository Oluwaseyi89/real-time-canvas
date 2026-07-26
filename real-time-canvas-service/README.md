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
- **Redis** – Session storage and pub/sub
- **Migrations** – Version-controlled schema migrations
- **Soft Delete** – Data retention with deleted_at

## 📁 Project Structure
```
real-time-canvas-service/
├── api/
│ └── routes.go # HTTP route definitions
├── cmd/
│ └── api/
│ └── main.go # Application entry point
├── internal/
│ ├── config/
│ │ ├── config.go # Configuration loading
│ │ ├── database.go # Database connections
│ │ └── migrate.go # Migration runner
│ ├── handlers/
│ │ ├── auth_handler.go # Authentication endpoints
│ │ ├── room_handler.go # Room management endpoints
│ │ ├── canvas_handler.go # Canvas object endpoints
│ │ └── websocket_handler.go # WebSocket connection handler
│ ├── middleware/
│ │ ├── auth.go # JWT authentication
│ │ ├── cors.go # CORS configuration
│ │ └── logging.go # Request logging
│ ├── models/
│ │ ├── dto/ # Data Transfer Objects
│ │ │ ├── user.go
│ │ │ ├── room.go
│ │ │ ├── canvas.go
│ │ │ └── sync.go
│ │ ├── user.go # User model
│ │ ├── room.go # Room model
│ │ ├── room_user.go # Room membership model
│ │ ├── canvas_object.go # Canvas object model
│ │ └── sync_event.go # Sync event model
│ ├── repository/
│ │ ├── postgres/ # PostgreSQL repositories
│ │ │ ├── user_repo.go
│ │ │ ├── room_repo.go
│ │ │ └── canvas_repo.go
│ │ └── redis/ # Redis repositories
│ │ ├── session_repo.go
│ │ └── pubsub.go
│ ├── services/
│ │ ├── user_service.go # User business logic
│ │ ├── room_service.go # Room business logic
│ │ ├── canvas_service.go # Canvas business logic
│ │ ├── sync_service.go # Sync business logic
│ │ └── physics_service.go # Physics business logic
│ └── websocket/
│ ├── hub.go # WebSocket connection hub
│ ├── client.go # WebSocket client handling
│ ├── message.go # WebSocket message types
│ └── room_manager.go # Room metadata management
├── migrations/
│ ├── 001_initial_schema.up.sql
│ └── 001_initial_schema.down.sql
├── pkg/
│ ├── database/
│ │ ├── postgres.go
│ │ └── redis.go
│ ├── redis/
│ │ └── service.go
│ └── utils/
│ ├── id_generator.go
│ └── validator.go
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

## 🚀 Getting Started

### Prerequisites

- **Go** >= 1.21
- **PostgreSQL** >= 15
- **Redis** >= 7

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/collaborative-canvas.git
cd collaborative-canvas/real-time-canvas-service

# Install dependencies
go mod download

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run migrations
go run cmd/api/main.go

# Build the binary
go build -o canvas-service cmd/api/main.go

# Run the service
./canvas-service
```

## Environment Variables
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

## Database Migrations
```bash
# Run migrations
go run cmd/api/main.go

# Or use migrate CLI
migrate -database postgres://user:pass@localhost:5432/db -path migrations up
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) – Web framework
- [GORM](https://gorm.io/) – ORM library
- [Gorilla WebSocket](https://github.com/gorilla/websocket) – WebSocket library
- [golang-migrate](https://github.com/golang-migrate/migrate) – Migration tool
- [go-redis](https://github.com/redis/go-redis) – Redis client

---

**Made with ❤️ by the Collaborative Canvas Team**