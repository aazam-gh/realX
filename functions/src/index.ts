import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

export const createVendorUser = onCall(
  {region: "me-central1"},
  async (request) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {name, email, password} = data;

    // 3️⃣ Validate input
    if (!name || !email || !password) {
      throw new HttpsError(
        "invalid-argument",
        "name, email, and password are required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Create Auth user
    const user = await authAdmin.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, // optional since you're onboarding manually
    });

    // 6️⃣ Create vendor Firestore document
    await db.collection("vendors").doc(user.uid).set({
      name,
      email,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("Vendor created", {
      vendorId: user.uid,
    });

    return {
      uid: user.uid,
      success: true,
    };
  }
);

// Set admin claim for a user (can only be called by existing admin, or use Firebase Console for first admin)
export const setAdminClaim = onCall(
  {region: "me-central1"},
  async (request) => {
    const {auth, data} = request;
    const {uid} = data;

    // For initial setup, you may temporarily comment out this check
    // to set the first admin, then uncomment it again
    if (!auth?.token.admin) {
      throw new HttpsError("permission-denied", "Only admins can set admin claims");
    }

    if (!uid) {
      throw new HttpsError("invalid-argument", "uid is required");
    }

    const authAdmin = getAuth();
    await authAdmin.setCustomUserClaims(uid, {admin: true});

    logger.info("Admin claim set for user", {uid});

    return {success: true, uid};
  }
);
