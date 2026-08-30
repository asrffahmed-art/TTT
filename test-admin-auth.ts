import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import config from "./firebase-applet-config.json" assert { type: "json" };
const app = !getApps().length ? initializeApp({ projectId: config.projectId }) : getApps()[0];
getAuth(app).listUsers(1).then(console.log).catch(console.error);
