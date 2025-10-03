// frontend/src/main.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { setApiToast } from "./api";

function ApiToastBridge() {
  const toast = useToast();
  useEffect(() => {
    setApiToast(toast.show);
  }, [toast]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <ApiToastBridge />
      <App />
    </ToastProvider>
  </React.StrictMode>
);
