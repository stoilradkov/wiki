import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@wiki/frontend/App";
import "@wiki/frontend/styles.css";

createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
