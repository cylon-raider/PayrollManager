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
   - Update `app/services/firebase.ts` (or environment variables) with your Firebase config keys.

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
firebase deploy
```
