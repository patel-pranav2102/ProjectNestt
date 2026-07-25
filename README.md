# ProjectNest - Developer Collaboration Platform

ProjectNest is an all-in-one developer collaboration platform inspired by Slack, Trello, Notion, GitHub Discussions, and ChatGPT. It provides real-time chat, task management, document editing, collaborative whiteboards, code snippet sharing, and AI assistance within a single workspace.

## Technology Stack Rationale

### Frontend
- **React 19**: Standard for modern, responsive, component-driven UI.
- **Vite**: Ultra-fast build tool and dev server.
- **Tailwind CSS**: Utility-first CSS framework for rapid and modern UI styling.
- **React Router**: For routing between dashboards, workspaces, and chat rooms.
- **Redux (Toolkit)**: For global client-side state management (user sessions, settings, theme).
- **TanStack Query (React Query)**: For server state management, caching, background updating, and synchronizing data with the REST APIs.
- **Axios**: Promised-based HTTP client for API requests.
- **React Hook Form**: For clean, performant, and validated form handlings.
- **Monaco Editor**: High-performance code editor component (powering VS Code) to support editing code snippets.
- **Excalidraw**: Canvas drawing component to support real-time collaborative whiteboards.

### Backend
- **Node.js & Express.js**: High-performance, scalable Javascript runtime and routing framework.
- **Socket.io**: Real-time bidirectional event-based communication.
- **JWT (Json Web Tokens)**: Secure token-based user authentication.
- **bcrypt**: Secure hashing for passwords.
- **Multer & Cloudinary**: For handling file uploads and hosting them in the cloud.
- **Nodemailer**: For sending transactional emails (verification, password resets).

### Database
- **MongoDB Atlas & Mongoose**: A robust NoSQL database and Object Data Modeling (ODM) library for flexible schema configuration.

### AI Engine
- **Gemini API**: Powerful, modern AI model for smart assistance, code explanation, reviews, and README generation.

---

## Folder Structure

We follow a clean separation of concerns. The codebase is divided into two primary subdirectories:

```text
ProjectNest/
├── client/                      # React Frontend (Vite)
│   ├── public/                  # Static assets
│   └── src/
│       ├── assets/              # Styling resources, icons, images
│       ├── components/          # Reusable UI components
│       │   ├── common/          # Global UI (Inputs, Buttons, Spinners)
│       │   ├── chat/            # Chat-specific elements
│       │   ├── kanban/          # Task board elements
│       │   └── whiteboard/      # Canvas drawing components
│       ├── context/             # React Contexts
│       ├── features/            # Redux store configuration and slices
│       ├── hooks/               # Custom hooks
│       ├── layouts/             # Shared page layouts
│       ├── pages/               # Views / page components
│       ├── routes/              # Routing configuration
│       ├── services/            # Axios instance and TanStack Query endpoints
│       ├── utils/               # Formatting and utility functions
│       ├── App.jsx              # App shell
│       ├── index.css            # Base Tailwind and custom styles
│       └── main.jsx             # React mount entrypoint
│
└── server/                      # Node.js / Express Backend
    ├── src/
    │   ├── config/              # DB, Cloudinary, Gemini setups
    │   ├── controllers/         # Request handling and control logic
    │   ├── middlewares/         # Auth, validation, roles, error handlers
    │   ├── models/              # Database schema definitions
    │   ├── routes/              # Express API endpoints
    │   ├── services/            # Business & external integration services
    │   ├── sockets/             # Socket event controllers
    │   ├── utils/               # Custom helpers and classes
    │   ├── validation/          # Request validations
    │   ├── app.js               # Express application configurations
    │   └── server.js            # Node runtime entrypoint and Socket.io server
    └── .gitignore               # System-wide git ignores
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cluster URI)

### Setup & Installation

1. **Clone and Navigate**:
   ```bash
   cd ProjectNest
   ```

2. **Backend Configuration**:
   Navigate to the `server/` directory, install dependencies, and set up your variables:
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```
   *Edit `server/.env` to configure your MongoDB connection, secrets, Nodemailer SMTP, and Cloudinary keys.*

3. **Frontend Configuration**:
   Navigate to the `client/` directory, install dependencies, and set up variables:
   ```bash
   cd ../client
   npm install
   cp .env.example .env
   ```

### Running Locally

- **Start Backend API & Socket Server**:
  ```bash
  cd server
  npm run dev
  ```
  The server starts at `http://localhost:5000`. You can test API status by visiting `http://localhost:5000/health`.

- **Start Vite Development Frontend**:
  ```bash
  cd client
  npm run dev
  ```
  The client dev server runs at `http://localhost:5173`.
