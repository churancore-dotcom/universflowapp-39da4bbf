import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Apply saved theme tokens BEFORE React mounts (prevents flash + ensures every page is themed)
import "@/lib/themeBoot";

// Initialize Median detection globals
import "@/lib/median";

// Initialize Sentry error monitoring (must run before React mounts)
import { initSentry } from "@/lib/sentry";
initSentry();

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
