# IAM Access Control System

A comprehensive **Identity and Access Management (IAM)** system built as a full-stack application demonstrating Role-Based Access Control (RBAC) principles with modern web technologies.

## 🚀 Features

### **Complete CRUD Operations**
- **Users Management** - Create, view, edit, and delete users
- **Groups Management** - Organize users into logical groups
- **Roles Management** - Define roles with specific permissions
- **Modules Management** - Business area categorization
- **Permissions Management** - Fine-grained access control

### **Access Control System**
- **Role-Based Access Control (RBAC)** - Users → Groups → Roles → Permissions
- **Permission Inheritance** - Users inherit permissions only through group memberships
- **Real-time Permission Testing** - Interactive dashboard to test user permissions
- **Secure Authentication** - JWT-based authentication with bcrypt password hashing

### **Professional UI/UX**
- **Modern Design** - Clean, responsive interface built with Tailwind CSS
- **Interactive Dashboard** - Real-time permission overview and testing
- **Advanced Assignment Management** - Intuitive interfaces for managing relationships
- **Error Handling** - Comprehensive error states and user feedback

## 🛠️ Technology Stack

### **Frontend**
- **React.js** - Modern component-based UI library
- **Redux Toolkit** - Predictable state management
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API communication

### **Backend**
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **SQLite (In-Memory)** - Lightweight database for demonstration
- **JWT (jsonwebtoken)** - Secure authentication tokens
- **bcryptjs** - Password hashing and validation
- **better-sqlite3** - Synchronous SQLite database interface

### **Security Features**
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Both client-side and server-side validation
- **Permission Middleware** - Route-level access control

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**

## 🚀 Installation & Setup

### **1. Clone the Repository**
```bash
git clone https://github.com/Kenneth14031129/IAM-System.git
cd IAM-System
```

### **2. Backend Setup**
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the backend server
npm run dev
```
The backend will run on `http://localhost:3001`

### **3. Frontend Setup**
```bash

# Install dependencies
npm install

# Start the frontend development server
npm start
```
The frontend will run on `http://localhost:3001`

## 🔐 Default Login Credentials

To access the system immediately after setup:

```
Username: admin
Password: admin123
```

This admin user has full permissions to demonstrate all system features.

## 📁 Project Structure

```
IAM-System/
├── backend/               # Express.js backend
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication & validation middleware
│   ├── routes/            # API route handlers
│   └── server.js          # Express server entry point
├── src/                 # React.js frontend
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── store/           # Redux store and slices
│   └── App.js           # Main app component  
│
└── README.md
```

## 🌐 API Endpoints

### **Authentication**
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/me/permissions` - Get current user permissions
- `POST /api/simulate-action` - Test permission simulation

### **Users Management**
- `GET /api/users` - Fetch all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Groups Management**
- `GET /api/groups` - Fetch all groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:groupId/users` - Assign user to group

### **Roles Management**
- `GET /api/roles` - Fetch all roles
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/groups/:groupId/roles` - Assign role to group

### **Modules Management**
- `GET /api/modules` - Fetch all modules
- `POST /api/modules` - Create new module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

### **Permissions Management**
- `GET /api/permissions` - Fetch all permissions
- `POST /api/permissions` - Create new permission
- `PUT /api/permissions/:id` - Update permission
- `DELETE /api/permissions/:id` - Delete permission
- `POST /api/roles/:roleId/permissions` - Assign permission to role

## 🎯 Usage Guide

### **Getting Started**
1. **Login** with the default admin credentials
2. **Explore the Dashboard** to see your current permissions
3. **Test Permissions** using the simulation feature
4. **Manage Users** by creating new users and assigning them to groups
5. **Configure Access** by creating roles with specific permissions

### **Access Control Flow**
1. **Create Modules** - Define business areas (e.g., "Reports", "Settings")
2. **Create Permissions** - Define actions on modules (create, read, update, delete)
3. **Create Roles** - Group related permissions together
4. **Create Groups** - Assign roles to groups
5. **Assign Users** - Add users to appropriate groups

### **Key Features to Try**
- **Permission Testing** - Use the dashboard to test if you can perform specific actions
- **User Management** - Create users and see their group memberships
- **Role Assignment** - Assign multiple roles to groups and see inherited permissions
- **Real-time Updates** - Changes are reflected immediately across the system

## 🔒 Security Features

- **Authentication Required** - All protected routes require valid JWT tokens
- **Permission-Based Access** - Fine-grained control over who can access what
- **Rate Limiting** - Protection against brute force attacks (5 attempts per 15 minutes)
- **Input Validation** - Comprehensive validation on both frontend and backend
- **Password Security** - bcrypt hashing with salt rounds
- **SQL Injection Protection** - Prepared statements throughout

## 🏗️ Architecture Highlights

### **Frontend Architecture**
- **Component-Based** - Reusable, modular React components
- **State Management** - Centralized state with Redux Toolkit
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Error Boundaries** - Graceful error handling and user feedback

### **Backend Architecture**
- **RESTful API** - Clean, predictable API endpoints
- **Middleware Pattern** - Modular authentication and validation
- **Database Abstraction** - Clean separation between routes and data access
- **Error Handling** - Consistent error responses across all endpoints

### **Database Schema**
- **Users** - User accounts and credentials
- **Groups** - Logical user groupings
- **Roles** - Permission collections
- **Modules** - Business area definitions
- **Permissions** - Granular access rights
- **Relationship Tables** - user_groups, group_roles, role_permissions 

---

**Note**: This is a demonstration project built for technical assessment purposes. The in-memory SQLite database resets on server restart, which is intentional for testing and evaluation.