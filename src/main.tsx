import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/canvas.css";
import { installPublicAnalytics } from "./analytics";
import { registerPwaServiceWorker } from "./pwa";

createRoot(document.getElementById("root")!).render(<React.StrictMode><Home /></React.StrictMode>);
installPublicAnalytics();
registerPwaServiceWorker();
