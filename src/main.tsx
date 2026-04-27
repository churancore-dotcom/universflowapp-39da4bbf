import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme tokens BEFORE React mounts (prevents flash + ensures every page is themed)
import "@/lib/themeBoot";

// Initialize Median detection globals
import "@/lib/median";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

