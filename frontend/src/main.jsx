import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { initTheme } from "./components/ThemeToggle.jsx";
import "./index.css";
import { installGlobalSounds } from "./lib/sound.js";

initTheme();
installGlobalSounds();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
