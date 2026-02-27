import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Median detection globals
import "@/lib/median";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
}

