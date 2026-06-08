/**
 * React Router 7 Route Configuration
 * 
 * This file maps URL path segments to their corresponding route component files.
 * It uses the React Router dev/routes helper functions:
 * - `layout`: Wraps child routes with a shared layout component (e.g. for global navigation or auth checks).
 * - `index`: Specifies the default child route for a layout's parent path.
 * - `route`: Defines a standard route mapping a URL path to a page file.
 */
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    // The main app layout contains the Sidebar and enforces authentication.
    // All routes nested under this layout are protected routes.
    layout("routes/layout.tsx", [
        index("routes/home.tsx"),
        route("financials", "routes/financials.tsx"),
        route("schedule", "routes/schedule.tsx"),
        route("team", "routes/team.tsx"),
    ]),
    // Public routes (e.g. Login) exist outside the authenticated layout.
    route("login", "routes/login.tsx"),
] satisfies RouteConfig;
