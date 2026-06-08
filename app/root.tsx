/**
 * Root Application Module for React Router 7
 * 
 * This file serves as the entry point layout for the entire HTML document.
 * It is responsible for setting up global styles, metadata elements, font preloading,
 * and the topmost Error Boundary to catch unhandled application exceptions.
 */

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

/**
 * Declares global HTML head elements such as stylesheets or preconnect tags.
 * We preconnect to Google Fonts and load the custom Inter and Outfit families.
 */
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@300;400;500;600;700&display=swap",
  },
];

/**
 * Shared HTML shell layout. React Router wraps the rendered output of matching
 * routes inside this component to construct the base HTML document.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Renders all route-specific <meta> tags */}
        <Meta />
        {/* Renders all styles returned by the links() functions */}
        <Links />
      </head>
      <body>
        {children}
        {/* Restores scroll position on navigation transitions */}
        <ScrollRestoration />
        {/* Injects the bundled client application script bundle */}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * The main App component renders the current matching route via the `<Outlet />`.
 */
export default function App() {
  return <Outlet />;
}

/**
 * Global Error Boundary.
 * Catches any unhandled errors bubble up from page controllers, loaders, or actions.
 * Provides fallback UI and helpful diagnostics if in development mode.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  // Inspect the error object to show appropriate diagnostics
  if (isRouteErrorResponse(error)) {
    // React Router threw a response (e.g. 404 Not Found or 500 Server Error)
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    // A standard JS runtime error occurred
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1 className="text-3xl font-bold text-red-600 mb-2">{message}</h1>
      <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">{details}</p>
      {/* If a stack trace is available, display it for easier local debugging */}
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <code className="text-xs text-red-500 font-mono">{stack}</code>
        </pre>
      )}
    </main>
  );
}
