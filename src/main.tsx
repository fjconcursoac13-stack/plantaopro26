import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register the Service Worker ONCE (avoids multiple registrations and reload loops)
// that can cause auth refresh storms.
if ("serviceWorker" in navigator) {
  const w = window as unknown as { __pp_sw_registered?: boolean };
  if (!w.__pp_sw_registered) {
    w.__pp_sw_registered = true;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        try {
          await registration.update();
        } catch {
          // ignore
        }

        // If there's a waiting SW, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // When a new SW is found, activate it immediately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // IMPORTANT: do NOT auto-reload on controllerchange.
        // Reload loops can trigger multiple auth refresh attempts.
        console.log("Service Worker registered successfully");
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
