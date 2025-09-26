# 🚀 Smart Collab Frontend

A modern, responsive React TypeScript application for collaborative document editing and team management.

## ✨ Features

- **🔐 Complete Authentication System**
  - User registration with email verification
  - Secure login/logout functionality
  - JWT token management with automatic refresh
  - Password strength validation

- **📱 Modern UI/UX**
  - Responsive design for all devices
  - Clean, professional interface
  - Loading states and error handling
  - Tailwind CSS for styling

- **🛡️ Type Safety**
  - Full TypeScript implementation
  - Comprehensive type definitions
  - Runtime validation

- **⚡ Performance Optimized**
  - Vite for fast development and building
  - Code splitting and lazy loading
  - Optimized bundle size

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **State Management**: React Context API
- **HTTP Client**: Fetch API
- **Development**: ESLint, TypeScript

## 📋 Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Smart Collab Backend API running (see backend repository)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd smart-collab-frontend

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000

# App Configuration
REACT_APP_APP_NAME=Smart Collab
REACT_APP_VERSION=1.0.0
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── EmailVerificationPage.tsx
│   └── Dashboard.tsx   # Main dashboard component
├── hooks/              # Custom React hooks
│   └── useAuth.tsx     # Authentication hook and context
├── services/           # API services
│   └── auth.service.ts # Authentication service
├── types/              # TypeScript type definitions
│   └── auth.ts         # Authentication types
├── utils/              # Utility functions and constants
│   └── constants.ts    # App constants and configuration
├── App.tsx             # Main app component
├── main.tsx           # Entry point
├── App.css            # Global styles
└── index.css          # Base styles
```

## 🔐 Authentication Flow

### Registration Process
1. User fills out registration form
2. Form validation (client-side)
3. API call to create account
4. Success message with email verification prompt
5. Email verification link handling

### Login Process
1. User enters credentials
2. Form validation
3. API authentication
4. JWT token storage
5. Redirect to dashboard

### Protected Routes
- Automatic token validation
- Token refresh handling
- Redirect to login if unauthorized

## 🎨 UI Components

### Authentication Pages

#### Login Page (`/login`)
- Username/password form
- Form validation with error messages
- Password visibility toggle
- Remember me option
- Loading states
- Link to registration

#### Registration Page (`/register`)
- Comprehensive form with validation
- Real-time validation feedback
- Password strength requirements
- Timezone selection
- Success state with email verification prompt

#### Email Verification (`/verify-email`)
- Token-based verification
- Multiple states (verifying, success, error, resend)
- Resend verification functionality
- User-friendly error messages

### Dashboard
- User profile information
- Welcome message
- Next steps guidance
- Responsive layout

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## 🌐 API Integration

The frontend integrates with the Smart Collab Backend API:

### Authentication Endpoints
- `POST /auth/login/` - User login
- `POST /auth/register/` - User registration
- `POST /auth/verify-email/` - Email verification
- `POST /auth/resend-verification/` - Resend verification email
- `GET /auth/profile/` - Get current user profile
- `POST /auth/token/refresh/` - Refresh JWT token

### Request/Response Handling
- Automatic token attachment
- Error response parsing
- Loading state management
- Token refresh on expiry

## 🔒 Security Features

- **JWT Token Management**: Secure storage and automatic refresh
- **Input Validation**: Client-side validation with server-side backup
- **XSS Protection**: Proper input sanitization
- **CSRF Protection**: Token-based authentication
- **Secure Headers**: Proper security headers implementation

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Tablet Support**: Enhanced experience on tablets
- **Desktop**: Full-featured desktop interface
- **Touch Friendly**: Optimized for touch interactions

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

The built files in the `dist` directory can be deployed to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting service

### Environment Variables for Production

```env
REACT_APP_API_URL=https://api.smartcollab.com/api/v1
REACT_APP_WS_URL=wss://api.smartcollab.com
REACT_APP_APP_NAME=Smart Collab
REACT_APP_VERSION=1.0.0
```

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow React hooks best practices
- Implement proper error boundaries
- Use semantic HTML elements
- Follow accessibility guidelines

### Component Structure
```typescript
import React from 'react';
import { ComponentProps } from './types';

interface Props {
  // Define props interface
}

const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Component logic
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default Component;
```

### State Management
- Use React Context for global state
- useState for local component state
- Custom hooks for reusable logic

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured for frontend URL
   - Check API_BASE_URL in environment variables

2. **Authentication Issues**
   - Verify JWT token format
   - Check token expiration handling
   - Ensure backend authentication endpoints are accessible

3. **Build Errors**
   - Run `npm run type-check` to identify TypeScript errors
   - Clear node_modules and reinstall dependencies
   - Check for missing environment variables

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 📚 Next Steps

After setting up authentication, you can extend the application with:

1. **Document Management**
   - Document CRUD operations
   - Rich text editor integration
   - Version control

2. **Real-time Collaboration**
   - WebSocket integration
   - Live cursor tracking
   - Collaborative editing

3. **File Management**
   - File upload/download
   - File sharing
   - Permission management

4. **Organization Management**
   - Team creation
   - Member management
   - Role-based access control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the implementation plan

---

**Happy Coding! 🚀**