import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "./context/WalletContext";
import { GameFlowProvider } from "./context/GameFlowContext";
import { Layout } from "./components/Layout";
import { YourCrates } from "./screens/YourCrates";
import { CashOut } from "./screens/CashOut";

// Suppress errors from browser extensions (wallet extensions, etc.)
window.addEventListener('error', (event) => {
  // Check if error is from content scripts (browser extensions)
  if (
    event.filename?.includes('content-bundle.js') ||
    event.filename?.includes('content-script') ||
    event.filename?.includes('extension://') ||
    event.message?.includes('content-bundle')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.stack?.includes('content-bundle') ||
    event.reason?.message?.includes('content-bundle')
  ) {
    event.preventDefault();
  }
});

// Initialize app when DOM is ready
function initApp() {
  const appElement = document.getElementById("app");
  
  if (!appElement) {
    console.error("App root element not found");
    return;
  }

  try {
    const root = createRoot(appElement);
    root.render(
  <StrictMode>
    <WalletContextProvider>
      <GameFlowProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={null} />
              <Route path="/crate" element={null} />
              <Route path="/pick-category" element={null} />
              <Route path="/success-redeem" element={null} />
            </Route>
            <Route
              path="/your-crates"
              element={
                <YourCrates
                  onOpenCrate={(crateId) => {
                    console.log("Opening crate:", crateId);
                  }}
                  onBack={() => window.history.back()}
                />
              }
            />
            <Route
              path="/cash-out"
              element={
                <CashOut
                  onConfirm={() => {
                    window.location.href = "/success-redeem";
                  }}
                  onBack={() => window.history.back()}
                />
              }
            />
            <Route path="/success-redeem" element={null} />
          </Routes>
        </BrowserRouter>
      </GameFlowProvider>
    </WalletContextProvider>
  </StrictMode>,
);
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM is already ready
  initApp();
}
