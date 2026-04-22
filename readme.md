# ChatApp

Real-time chat application with user authentication and email-based user discovery.

## Features

- User registration and login
- Email-based user search
- Real-time messaging with Socket.io
- Conversation management
- Typing indicators
- Responsive design

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Backend**: Express.js, TypeScript, Socket.io
- **Database**: PostgreSQL with Prisma ORM

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Setup

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE chatapp;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Usage

1. Open http://localhost:3000 in your browser
2. Register a new account with your email
3. Search for other users by their email address
4. Start a conversation and chat in real-time

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search?email={email}` - Search users by email

### Chat
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

## Project Structure

```
chatapp/
  frontend/          # Next.js application
    src/
      app/           # Pages and routes
      components/    # React components
      lib/           # API and utilities
      store/         # Zustand stores
  backend/           # Express.js server
    src/
      config/        # Database and socket config
      controllers/   # Request handlers
      middleware/    # Auth and validation
      routes/        # API routes
      services/      # Business logic
    prisma/          # Database schema
```
