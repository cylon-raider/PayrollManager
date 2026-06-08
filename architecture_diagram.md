# Architectural Diagram & Design System

This document provides a comprehensive overview of the **Family Dental Station (FDS) Payroll Manager** application architecture. It serves as an architectural walkthrough for development onboarding, technical interviews, and review of system flows.

---

## 1. High-Level System Architecture

The FDS Payroll Manager is a full-stack, client-heavy web application built on a modern serverless model. 

```mermaid
graph TD
    subgraph Client [Client-Side App: React Router 7]
        direction TB
        root[Root.tsx Component] --> layout[AppLayout Layout Route]
        layout --> sidebar[Sidebar Component]
        layout --> outlet[React Router Outlet]
        
        outlet --> home[Home Route]
        outlet --> schedule[Schedule Route]
        outlet --> financials[Financials Route]
        outlet --> team[Team Route]
        
        login[Login Route] -.-> auth_serv[Auth Service]
    end

    subgraph Utilities [Utilities Layer]
        calc[calculations.ts]
        date_ut[date.ts]
        consts[constants.ts]
    end

    subgraph Firebase [Backend: Google Firebase]
        direction LR
        fb_auth[(Firebase Auth)]
        fb_fs[(Cloud Firestore)]
    end

    %% Client Interactions with Services
    layout --> auth_ctx[AuthContext]
    auth_ctx --> fb_auth
    auth_ctx --> fb_fs

    schedule --> fb_fs
    financials --> fb_fs
    team --> fb_fs

    %% Util Usage
    schedule --> calc & date_ut
    financials --> calc & date_ut & consts
    team --> calc & consts
```

### Key Architectural Layers:
1. **Routing Layer (React Router v7)**: Uses layout-nested routing. The layout functions as an authentication and authorization guard, injecting global authorization state via React Context.
2. **Context Layer (State)**: A centralized `AuthContext` retrieves the logged-in user from Firebase Auth, checks or instantiates their metadata role in Firestore, and exposes global auth flags (`user`, `appUser`, `loading`, `isAdmin`).
3. **Database Layer (Cloud Firestore)**: Relies on real-time collection sync (`onSnapshot`) for real-time reactivity without state management engines like Redux.
4. **Business & Utils Layer**: Self-contained mathematical calculations (payroll tax multipliers, EBITDA, production targets) and smart formatting handlers.

---

## 2. Authentication & Authorization Guard Flow

Access control is strictly enforced on the client side via the layout structure, while Firestore security rules enforce it on the server side.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant App as AppLayout / Root
    participant Context as AuthContext (useAuth)
    participant FBAuth as Firebase Authentication
    participant Firestore as Cloud Firestore (/users/{uid})
    participant Login as Login Route (/login)
    participant Dashboard as Main Dashboard (/)

    User->>App: Navigate to app
    App->>Context: Mount & Register Auth Listener
    Context->>FBAuth: Check session state
    alt No Active Session
        FBAuth-->>Context: Return null user
        Context-->>App: Set loading = false, user = null
        App->>Login: Redirect to /login
        Login-->>User: Render Login/Register Form
    else Active Session Found
        FBAuth-->>Context: Return Firebase User object
        Context->>Firestore: Fetch user profile (users collection)
        alt Profile Exists
            Firestore-->>Context: Return appUser (role: 'admin' | 'viewer')
        else First Time User
            Context->>Firestore: Count total users in database
            Firestore-->>Context: Return count
            Note over Context: If count == 0: role = 'admin'<br/>Else: role = 'viewer'
            Context->>Firestore: Create document in /users/{uid}
        end
        Context-->>App: Set loading = false, user = currentUser, appUser = profile
        App->>Dashboard: Render page contents via <Outlet />
        Dashboard-->>User: Render authenticated views
    end
```

### Authorization Levels
- **Admin**: Full access. Can add/edit/delete staff profiles, view hourly rates, modify app user roles (privilege management), view EBITDA and financial collections, and view daily/weekly/monthly breakdowns.
- **Viewer**: Read-only directory access. Can access the Dashboard and Weekly Schedule (read/write shifts), but financials are completely locked down. The sidebar dynamically filters administrative routes.

---

## 3. Real-Time Data Flow & State Lifecycle

Rather than relying on heavy API layers or polling, the app leverages Firestore's native WebSockets integration.

```mermaid
graph LR
    subgraph Firestore Cloud
        db_staff[(staff)]
        db_sched[(schedule)]
        db_logs[(daily_logs)]
    end

    subgraph Client State [Active Component Local States]
        state_staff[staff state]
        state_sched[schedule state]
        state_logs[dailyLogs state]
    end

    subgraph UI View
        sub_grid[Grid Render / Form]
    end

    %% Web Socket subscriptions
    db_staff -- "onSnapshot (real-time listener)" --> state_staff
    db_sched -- "onSnapshot (real-time listener)" --> state_sched
    db_logs -- "onSnapshot (real-time listener)" --> state_logs

    state_staff & state_sched & state_logs --> sub_grid

    %% Updates flow
    sub_grid -- "setDoc / updateDoc / deleteDoc" --> db_staff
    sub_grid -- "setDoc / updateDoc" --> db_sched
    sub_grid -- "setDoc (collections)" --> db_logs
```

1. **Subscriptions**: On component mount, `onSnapshot` listeners are established.
2. **Reactivity**: Any database update (from any connected terminal/admin) fires a WebSocket push, triggering state setters (`setStaff`, `setSchedule`, `setDailyLogs`).
3. **Clean-Up**: Unsubscribe hooks are returned from `useEffect` to prevent memory leaks.

---

## 4. Payroll Expense & EBITDA Mathematical Model

Financial calculations are isolated in `calculations.ts` to ensure consistency across views.

```mermaid
graph TD
    subgraph Inputs
        rate[Hourly Rate]
        hours[Scheduled Hours]
        coll[Collections Amount]
    end

    subgraph Calculation Engine [calculations.ts]
        hours -- "Start Time to End Time Parsing" --> parsed_hours[Parsed decimal hours]
        parsed_hours & rate --> raw_labor[Raw Labor Cost: Hours * Rate]
        raw_labor -- "Multiply by Tax Multiplier (1.17)" --> total_cost[Full Cost including Payroll Taxes]
        
        total_cost -- "cost / 0.25 (Staff target)" --> staff_prod[Staff Production Needed]
        total_cost -- "cost / 0.28 (Doctor target)" --> dr_prod[Doctor Production Needed]
    end

    subgraph Financial Output
        ebitda[EBITDA = Collections - Expenses]
        ebitda & coll --> margin[EBITDA Margin %]
    end

    total_cost --> ebitda
    coll --> ebitda
```

### Key Business Formulas:
- **Total Loaded Cost**:
  $$\text{Loaded Cost} = \text{Hours} \times \text{Hourly Rate} \times 1.17$$
  *Note: 1.17 represents a 17% employer payroll tax & benefit loading factor.*
- **Production Needed**:
  - Staff Target: Staff costs should constitute $\le 25\%$ of production.
    $$\text{Production Target} = \frac{\text{Staff Loaded Cost}}{0.25}$$
  - Doctor Target: Doctor costs should constitute $\le 28\%$ of production.
    $$\text{Production Target} = \frac{\text{Doctor Loaded Cost}}{0.28}$$
- **EBITDA & EBITDA Margin**:
  $$\text{EBITDA} = \text{Collections} - (\text{Staff Loaded Costs} + \text{Doctor Loaded Costs})$$
  $$\text{EBITDA Margin} = \left(\frac{\text{EBITDA}}{\text{Collections}}\right) \times 100$$
