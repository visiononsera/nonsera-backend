import admin from "firebase-admin"

import serviceAccount from "../config/firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const firebaseAdmin = admin;