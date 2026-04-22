# Chat Application Architecture

## Overview
Real-time chat application with user authentication, email-based user discovery, and dynamic scaling support for 5-500+ users.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context / Zustand
- **Real-time**: Socket.io-client
- **Form Handling**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful endpoints

### Database
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Connection Pooling**: Built-in Prisma pool

### Infrastructure
- **Environment**: Local development 
- **Process Manager**: PM2 (production)

---

## Database Schema

### Users Table
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  messagesSent   Message[] @relation("SentMessages")
  messagesReceived Message[] @relation("ReceivedMessages")
  conversations   Conversation[] @relation("UserConversations")
}
```

### Conversations Table
```prisma
model Conversation {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  participants User[] @relation("UserConversations")
  messages     Message[]
}
```

### Messages Table
```prisma
model Message {
  id             String   @id @default(uuid())
  content        String
  senderId       String
  receiverId     String
  conversationId String
  createdAt      DateTime @default(now())
  
  sender       User         @relation("SentMessages", fields: [senderId], references: [id])
  receiver     User         @relation("ReceivedMessages", fields: [receiverId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
  - Body: { email, password, name }
  - Response: { user, token }
  
- `POST /api/auth/login` - Login user
  - Body: { email, password }
  - Response: { user, token }

- `GET /api/auth/me` - Get current user (JWT protected)

### User Discovery
- `GET /api/users/search?email={email}` - Search user by email
  - Response: { id, name, email }

### Chat
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create/start conversation
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/conversations/:id/messages` - Send message

---

## Real-time Events (Socket.io)

### Client to Server
- `join_conversation` - Join a conversation room
- `send_message` - Send a message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing

### Server to Client
- `receive_message` - New message received
- `user_typing` - User is typing
- `user_joined` - User joined conversation
- `user_left` - User left conversation

---

## Project Structure

```
chatapp/
├── frontend/                 # Next.js application
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (chat)/
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── chat/
│   │   └── ui/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   └── utils.ts
│   ├── hooks/
│   └── public/
├── backend/                  # Express.js server
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── socket.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── chat.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── chat.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── chat.service.ts
│   │   ├── types/
│   │   └── server.ts
│   └── prisma/
│       └── schema.prisma
└── docker-compose.yml        # PostgreSQL setup
```

---

## Implementation Plan

### Phase 1: Infrastructure Setup
1. Initialize Next.js project with TypeScript
2. Initialize Express.js project with TypeScript
3. Set up PostgreSQL with docker-compose
4. Configure Prisma ORM
5. Create database schema
6. Run migrations

### Phase 2: Backend - Authentication
1. Implement user registration
2. Implement user login
3. JWT token generation and validation
4. Auth middleware
5. Password hashing (bcrypt)

### Phase 3: Backend - User Discovery
1. User search by email endpoint
2. User profile retrieval
3. Input validation

### Phase 4: Backend - Chat System
1. Conversation management
2. Message CRUD operations
3. Socket.io server setup
4. Real-time message broadcasting
5. Typing indicators

### Phase 5: Frontend - Authentication
1. Login page with form validation
2. Register page with form validation
3. JWT token storage (httpOnly cookies)
4. Protected route middleware
5. Auth context provider

### Phase 6: Frontend - User Discovery
1. User search interface
2. Search results display
3. User profile cards
4. Start conversation action

### Phase 7: Frontend - Chat Interface
1. Conversation list sidebar
2. Chat message area
3. Message input
4. Real-time message updates
5. Typing indicators
6. Message timestamps

### Phase 8: Integration & Testing
1. Connect frontend to backend APIs
2. Socket.io client integration
3. End-to-end testing
4. Error handling
5. Loading states

### Phase 9: Production Readiness
1. Environment variables
2. Build optimization
3. Security hardening
4. CORS configuration
5. Rate limiting

---

## Security Considerations

- Passwords hashed with bcrypt (salt rounds: 12)
- JWT tokens stored in httpOnly cookies
- CORS configured for frontend origin
- Input validation on all endpoints
- SQL injection prevention via Prisma ORM
- XSS prevention via React escaping
- Rate limiting on authentication endpoints
- HTTPS required in production

---

## Scaling Strategy

### Database
- Prisma connection pooling (default: 10 connections)
- Index on email field for fast lookups
- Efficient queries with proper relations

### Backend
- Socket.io with Redis adapter for horizontal scaling (future)
- Stateless REST API for easy scaling
- Efficient memory usage with event-driven architecture

### Frontend
- Optimistic UI updates
- Message pagination for large conversations
- Lazy loading of conversations
- Efficient re-renders with React memo

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/chatapp"
JWT_SECRET="your-secret-key"
PORT=5000
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```
