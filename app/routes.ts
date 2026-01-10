import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/layout.tsx", [
        index("routes/home.tsx"),
        route("financials", "routes/financials.tsx"),
        route("schedule", "routes/schedule.tsx"),
        route("team", "routes/team.tsx"),
    ]),
    route("login", "routes/login.tsx"),
] satisfies RouteConfig;
