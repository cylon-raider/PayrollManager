# Payroll Manager

A modern, full-stack payroll and team management application built with **React 19**, **React Router 7**, and **Firebase**.

## Features

- **Authentication**: Secure user authentication and management via Firebase Auth.
- **Team Management**: Comprehensive directory and role management for employees.
- **Financial Reporting**: Real-time financial dashboards and payroll tracking.
- **Scheduling**: Interactive team scheduling and shift management.
- **Modern UI**: Premium aesthetic with dark mode and glassmorphism using Tailwind CSS 4.

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [React Router 7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Backend/Infrastructure**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Hosting)
- **Tooling**: [Vite](https://vitejs.dev/), TypeScript

## Getting Started

### Prerequisites

- Node.js (v20 or later recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cylon-raider/PayrollManager.git
   cd PayrollManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Create a web app within the project.
   - Create a `.env` or `.env.local` file in the root directory and populate it with your Firebase config values:
     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     ```

### Development

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173` to view the application.

### Build

To create a production build:

```bash
npm run build
```

## Deployment

Deploy to Firebase Hosting:

```bash
npm run build
npx firebase deploy
# Or, to deploy only hosting:
npx firebase deploy --only hosting
```
