import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { pushConsoleError, pushDiagEvent } from "@/lib/diagLog";

// Capture console errors for the Diagnostics report (no sensitive values).
(function installConsoleCapture() {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    try {
      pushConsoleError(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    } catch {
      // ignore
    }
    originalError(...args);
  };
})();

function isSafeModeActive(): boolean {
  try {
    const enabled = localStorage.getItem('plantaopro_safe_mode') === 'true';
    const expiry = localStorage.getItem('plantaopro_safe_mode_expiry');
    if (!enabled) return false;
    if (!expiry) return true;
    return Date.now() < parseInt(expiry, 10);
  } catch {
    return false;
  }
}

// Register the Service Worker ONCE (avoids multiple registrations and reload loops)
// that can cause auth refresh storms.
if ("serviceWorker" in navigator && !isSafeModeActive()) {
  const w = window as unknown as { __pp_sw_registered?: boolean };
  if (!w.__pp_sw_registered) {
    w.__pp_sw_registered = true;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        pushDiagEvent('info', 'sw_registered', {
          scope: registration.scope,
          hasWaiting: !!registration.waiting,
        });

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
            pushDiagEvent('info', 'sw_state', { state: newWorker.state });
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
        pushDiagEvent('error', 'sw_register_failed', { message: String(error) });
        console.error("Service Worker registration failed:", error);
      });
  }
} else if ("serviceWorker" in navigator) {
  pushDiagEvent('warn', 'safe_mode_sw_skipped');
}

createRoot(document.getElementById("root")!).render(<App />);
