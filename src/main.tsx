import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MaidMatchApp from "./MaidMatchApp";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MaidMatchApp />
  </StrictMode>
);
