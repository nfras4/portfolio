import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

// easter-egg hint for dev-tools visitors
if (!import.meta.env.DEV) {
  console.log(
    "%cnick/%c hiring? nickwfraser@gmail.com · on a phone, the slash counts to five.",
    "font-family:monospace;font-weight:700;font-size:14px",
    "font-family:monospace;color:#888"
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
