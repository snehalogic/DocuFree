// frontend/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./index.css";

console.log("✅ main.tsx loaded");

import App from "./App";
import OcrResultsPage from "./pages/OcrResultsPage";

function RouteDebugger() {
  const location = useLocation();
  console.log("🗺️ Current route:", location.pathname);
  return null;
}

function AppRouter() {
  console.log("🚀 AppRouter rendering");
  
  return (
    <BrowserRouter>
      <RouteDebugger />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/ocrresults" element={<OcrResultsPage />} />
        <Route
          path="/summarization"
          element={
            <div className="min-h-screen p-8 bg-gray-50">
              <h1 className="text-2xl font-bold">Summarization (Coming Soon)</h1>
            </div>
          }
        />
        <Route
          path="/translation"
          element={
            <div className="min-h-screen p-8 bg-gray-50">
              <h1 className="text-2xl font-bold">Translation (Coming Soon)</h1>
            </div>
          }
        />
        <Route
          path="/ai-assistance"
          element={
            <div className="min-h-screen p-8 bg-gray-50">
              <h1 className="text-2xl font-bold">AI Assistance (Coming Soon)</h1>
            </div>
          }
        />
        <Route
          path="*"
          element={
            <div className="min-h-screen p-8 bg-red-50">
              <h1 className="text-2xl font-bold text-red-600">404 Not Found</h1>
              <p className="mt-4">Path: {window.location.pathname}</p>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById("root");
console.log("🎯 Root element:", !!rootElement);

if (!rootElement) {
  console.error("❌ Root element not found!");
} else {
  console.log("✅ Mounting app...");
  createRoot(rootElement).render(<AppRouter />);
  console.log("✅ App mounted!");
}