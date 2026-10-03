import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-3)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
                fontSize: "13px",
                borderRadius: "10px",
              },
              success: { iconTheme: { primary: "#06d6a0", secondary: "#fff" } },
              error:   { iconTheme: { primary: "#ef476f", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
