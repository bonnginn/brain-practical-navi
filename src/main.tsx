import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import {AppRecoveryBoundary} from "../app/AppRecoveryBoundary";
import "../app/globals.css";
import "../app/canvas.css";
import "../app/brodmann.css";
import "../app/observation-layout.css";
import "../app/workspace-design.css";
import { installPublicAnalytics } from "./analytics";
import { registerPwaServiceWorker } from "./pwa";

createRoot(document.getElementById("root")!).render(<React.StrictMode><AppRecoveryBoundary><Home /></AppRecoveryBoundary></React.StrictMode>);
installPublicAnalytics();
registerPwaServiceWorker();
