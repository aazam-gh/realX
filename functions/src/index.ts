import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {
  getFirestore,
  FieldPath,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {Resend} from "resend";
import {geohashForLocation} from "geofire-common";
import sharp from "sharp";
import {
  listAdminBigQueryTransactionsHandler,
} from "./admin-bigquery-transactions.js";
import {createNotificationFunctions} from "./notifications.js";

/* eslint-disable require-jsdoc, max-len */

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

const REGION = "me-central1";
const STORAGE_BUCKET = "reelx-backend";
const WEBP_QUALITY = 80;
const WEBP_CONVERTED_METADATA_KEY = "convertedToWebp";
const PUBLIC_IMAGE_PATHS = [
  /^banners\//,
  /^trending-offer-banners\//,
  /^vendors\/[^/]+\/branding\//,
  /^vendors\/[^/]+\/gallery\//,
  /^categories\//,
  /^brands\//,
  /^universities\//,
  /^events\//,
  /^featured-brand-showcase\//,
];
const HOLDING_GROUP_MAX_VENDORS = 30;
const HOLDING_TRANSACTION_MAX_PAGE_SIZE = 100;

const {
  processNotificationBroadcast,
  processNotificationReceipts,
  registerPushToken,
  sendNotification,
  unregisterPushToken,
} = createNotificationFunctions(getFirestore());
export {
  processNotificationBroadcast,
  processNotificationReceipts,
  registerPushToken,
  sendNotification,
  unregisterPushToken,
};

export const listAdminBigQueryTransactions = onCall(
  {
    region: REGION,
    cors: true,
    timeoutSeconds: 60,
    serviceAccount:
      "admin-bigquery-transactions@reelx-backend.iam.gserviceaccount.com",
  },
  listAdminBigQueryTransactionsHandler,
);

/**
 * Convert newly uploaded public media images to WebP in place.
 * Existing object paths and Firebase download tokens remain unchanged.
 */
export const convertUploadedImageToWebp = onObjectFinalized(
  {
    bucket: STORAGE_BUCKET,
    region: REGION,
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;
    const customMetadata = object.metadata || {};

    if (!filePath) {
      logger.info("Skipping image conversion: object has no path");
      return;
    }

    if (!PUBLIC_IMAGE_PATHS.some((pattern) => pattern.test(filePath))) {
      logger.info("Skipping image conversion: path is not public media", {
        filePath,
      });
      return;
    }

    if (
      contentType === "image/webp" ||
      customMetadata[WEBP_CONVERTED_METADATA_KEY] === "true"
    ) {
      logger.info("Skipping image conversion: object is already WebP", {
        filePath,
      });
      return;
    }

    if (contentType !== "image/jpeg" && contentType !== "image/png") {
      logger.info("Skipping image conversion: unsupported content type", {
        filePath,
        contentType,
      });
      return;
    }

    const bucket = getStorage().bucket(object.bucket);
    const sourceFile = bucket.file(filePath, {generation: object.generation});
    const destinationFile = bucket.file(filePath);

    try {
      const [source] = await sourceFile.download();
      const converted = await sharp(source)
        .webp({quality: WEBP_QUALITY})
        .toBuffer();

      await destinationFile.save(converted, {
        resumable: false,
        preconditionOpts: {ifGenerationMatch: object.generation},
        metadata: {
          cacheControl: object.cacheControl,
          contentDisposition: object.contentDisposition,
          contentEncoding: object.contentEncoding,
          contentLanguage: object.contentLanguage,
          contentType: "image/webp",
          metadata: {
            ...customMetadata,
            [WEBP_CONVERTED_METADATA_KEY]: "true",
          },
        },
      });

      logger.info("Converted uploaded image to WebP", {
        filePath,
        originalBytes: source.length,
        convertedBytes: converted.length,
        savedBytes: source.length - converted.length,
      });
    } catch (error) {
      logger.error("Failed to convert uploaded image to WebP", {
        filePath,
        contentType,
        error,
      });
    }
  },
);

// Fields to include in the maps/locations cache document
interface VendorMapEntry {
  name: string | null;
  nameAr: string | null;
  vendorName: string | null;
  vendorNameAr: string | null;
  latitude?: number;
  longitude?: number;
  geohash?: string;
  address: string | null;
  addressAr: string | null;
  mainCategory: string | null;
  profilePicture: string | null;
  xcard: boolean;
  offerTypes: string[];
  hasBuyOneGetOne: boolean;
  hasStudentDeal: boolean;
  openingHours: unknown;
  searchTokens: string[];
  firstOffer: {
    titleEn?: string;
    titleAr?: string;
    discountType?: string;
  } | null;
  locations: VendorMapLocation[];
}

interface VendorMapLocation {
  id: string;
  name: string | null;
  nameAr: string | null;
  phoneNumber: string | null;
  latitude: number;
  longitude: number;
  geohash: string;
  address: string | null;
  addressAr: string | null;
  isPrimary: boolean;
}

interface VendorMapLocationDoc {
  vendorId: string;
  locationId: string;
  name: string | null;
  nameAr: string | null;
  vendorName: string | null;
  vendorNameAr: string | null;
  branchName: string | null;
  branchNameAr: string | null;
  phoneNumber: string | null;
  latitude: number;
  longitude: number;
  geohash: string;
  geohash4: string;
  geohash5: string;
  geohash6: string;
  address: string | null;
  addressAr: string | null;
  mainCategory: string | null;
  profilePicture: string | null;
  vendorType: string | null;
  status: string | null;
  isActive: boolean;
  xcard: boolean;
  offerTypes: string[];
  hasBuyOneGetOne: boolean;
  hasStudentDeal: boolean;
  openingHours: unknown;
  searchTokens: string[];
  firstOffer: {
    titleEn?: string;
    titleAr?: string;
    discountType?: string;
  } | null;
  isPrimary: boolean;
  updatedAt: unknown;
}

interface HoldingGroup {
  name: string;
  status: "active" | "disabled";
  vendorIds: string[];
}

interface HoldingGroupUser {
  groupId: string;
  email: string;
  displayName: string;
  role: "owner" | "viewer";
  status: "active" | "disabled";
}

interface HoldingTransactionCursor {
  createdAtMillis: number;
  id: string;
}

function requireAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User not authenticated");
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return request.auth.uid;
}

function requireAuthUid(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User not authenticated");
  }
  return request.auth.uid;
}

function parseRequiredString(
  value: unknown,
  field: string,
  maxLength = 200,
) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be a non-empty string up to ${maxLength} characters`
    );
  }
  return value.trim();
}

function parseOptionalString(
  value: unknown,
  field: string,
  maxLength = 200,
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be a string up to ${maxLength} characters`
    );
  }
  return value.trim();
}

function parseHoldingVendorIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "vendorIds must be an array");
  }
  const vendorIds = value.map((vendorId) => {
    if (typeof vendorId !== "string" || !vendorId.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "vendorIds must contain only non-empty strings"
      );
    }
    return vendorId.trim();
  });
  const uniqueVendorIds = [...new Set(vendorIds)];
  if (uniqueVendorIds.length !== vendorIds.length) {
    throw new HttpsError("invalid-argument", "vendorIds cannot contain duplicates");
  }
  if (uniqueVendorIds.length > HOLDING_GROUP_MAX_VENDORS) {
    throw new HttpsError(
      "invalid-argument",
      `A holding group can include at most ${HOLDING_GROUP_MAX_VENDORS} vendors`
    );
  }
  return uniqueVendorIds;
}

async function assertVendorsExist(vendorIds: string[]) {
  if (!vendorIds.length) {
    return;
  }
  const db = getFirestore();
  const snapshots = await Promise.all(
    vendorIds.map((vendorId) => db.collection("vendors").doc(vendorId).get())
  );
  const missing = snapshots
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => snapshot.id);
  if (missing.length) {
    throw new HttpsError(
      "not-found",
      `Vendor not found: ${missing.join(", ")}`
    );
  }
}

async function getActiveHoldingAccess(uid: string) {
  const db = getFirestore();
  const userSnap = await db.collection("holdingGroupUsers").doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "Holding account required");
  }
  const user = userSnap.data() as HoldingGroupUser;
  if (user.status !== "active") {
    throw new HttpsError("permission-denied", "Holding account is disabled");
  }
  const groupSnap = await db.collection("holdingGroups").doc(user.groupId).get();
  if (!groupSnap.exists) {
    throw new HttpsError("failed-precondition", "Holding group not found");
  }
  const group = groupSnap.data() as HoldingGroup;
  if (group.status !== "active") {
    throw new HttpsError("permission-denied", "Holding group is disabled");
  }
  const vendorIds = Array.isArray(group.vendorIds) ? group.vendorIds : [];
  return {
    uid,
    groupId: user.groupId,
    user,
    group,
    vendorIds,
  };
}

function timestampToMillis(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
}

function timestampToIso(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function encodeHoldingCursor(cursor: HoldingTransactionCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeHoldingCursor(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || value.length > 2048) {
    throw new HttpsError("invalid-argument", "Invalid cursor");
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as HoldingTransactionCursor;
    if (
      !decoded ||
      !Number.isSafeInteger(decoded.createdAtMillis) ||
      typeof decoded.id !== "string"
    ) {
      throw new Error("Malformed cursor");
    }
    return decoded;
  } catch {
    throw new HttpsError("invalid-argument", "Invalid cursor");
  }
}

function mapTransactionSnapshot(
  snapshot: FirebaseFirestore.DocumentSnapshot,
) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    vendorId: data.vendorId || null,
    vendorName: data.vendorName || "Unknown Vendor",
    userId: data.userId || null,
    type: data.type || "N/A",
    status: data.status || "N/A",
    totalAmount: Number(data.totalAmount || 0),
    discountAmount: Number(data.discountAmount || 0),
    discountType: data.discountType || null,
    discountValue: data.discountValue ?? null,
    finalAmount: Number(data.finalAmount || 0),
    createdAt: timestampToIso(data.createdAt),
    createdAtMillis: timestampToMillis(data.createdAt),
    pin: data.pin || null,
    offerId: data.offerId || null,
    cashbackAmount: data.cashbackAmount ?? null,
    creatorCashbackAmount: data.creatorCashbackAmount ?? null,
    creatorCode: data.creatorCode ?? null,
    creatorCodeOwnerId: data.creatorCodeOwnerId ?? null,
    creatorUid: data.creatorUid ?? null,
    redemptionCardAmount: data.redemptionCardAmount ?? null,
    remainingAmount: data.remainingAmount ?? null,
  };
}

async function getHoldingVendorSummaries(vendorIds: string[]) {
  if (!vendorIds.length) {
    return [];
  }
  const db = getFirestore();
  const snapshots = await Promise.all(
    vendorIds.map((vendorId) => db.collection("vendors").doc(vendorId).get())
  );
  return snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => {
      const data = snapshot.data() || {};
      return {
        id: snapshot.id,
        name: data.name || "Unnamed Vendor",
        nameAr: data.nameAr || null,
        email: data.email || null,
        status: data.status || null,
        vendorType: data.vendorType || null,
        profilePicture: data.profilePicture || data.logo || data.logoUrl || null,
        activeOffers: Array.isArray(data.offers) ? data.offers.length : 0,
      };
    });
}

/**
 * Build a location entry from vendor data.
 * @param {FirebaseFirestore.DocumentData} data
 * @return {VendorMapEntry|null}
 */
function buildMapEntry(
  data: FirebaseFirestore.DocumentData,
): VendorMapEntry | null {
  const hasBranchLocations =
    Array.isArray(data.locations) && data.locations.length > 0;
  const rawLocations = hasBranchLocations ?
    data.locations :
    [{
      id: "primary",
      latitude: data.latitude,
      longitude: data.longitude,
      geohash: data.geohash,
      address: data.address,
      addressAr: data.addressAr,
      isPrimary: true,
    }];

  const locations = rawLocations.flatMap((
    location: Record<string, unknown>,
    index: number,
  ) => {
    const lat = location.latitude;
    const lng = location.longitude;
    if (
      typeof lat !== "number" || isNaN(lat) ||
      typeof lng !== "number" || isNaN(lng)
    ) {
      return [];
    }

    return [{
      id: typeof location.id === "string" && location.id.length > 0 ?
        location.id :
        (location.isPrimary === true ? "primary" : `branch-${index + 1}`),
      name: typeof location.name === "string" ? location.name : null,
      nameAr: typeof location.nameAr === "string" ? location.nameAr : null,
      phoneNumber: typeof location.phoneNumber === "string" ?
        location.phoneNumber :
        null,
      latitude: lat,
      longitude: lng,
      geohash: typeof location.geohash === "string" &&
        location.geohash.length > 0 ?
        location.geohash :
        geohashForLocation([lat, lng]).slice(0, 5),
      address: typeof location.address === "string" ?
        location.address :
        data.address || null,
      addressAr: typeof location.addressAr === "string" ?
        location.addressAr :
        data.addressAr || null,
      isPrimary: location.isPrimary === true || index === 0,
    }];
  });

  if (!locations.length) {
    return null;
  }

  const primaryLocation = locations.find((
    location: VendorMapLocation,
  ) => location.isPrimary) || locations[0];
  const firstOffer = Array.isArray(data.offers) && data.offers.length > 0 ?
    {
      titleEn: data.offers[0]?.titleEn || undefined,
      titleAr: data.offers[0]?.titleAr || undefined,
      discountType: data.offers[0]?.discountType || undefined,
    } :
    null;
  const rawOfferTypes = Array.isArray(data.offers) ?
    data.offers
      .map((offer: Record<string, unknown>) => offer.discountType)
      .filter((discountType: unknown) => typeof discountType === "string") :
    [];
  const offerTypes = rawOfferTypes.length ?
    [...new Set(rawOfferTypes)] as string[] :
    [];

  return {
    name: data.name || null,
    nameAr: data.nameAr || null,
    vendorName: data.name || null,
    vendorNameAr: data.nameAr || null,
    latitude: primaryLocation.latitude,
    longitude: primaryLocation.longitude,
    geohash: primaryLocation.geohash,
    address: data.address || null,
    addressAr: data.addressAr || null,
    mainCategory: data.mainCategory || null,
    profilePicture: data.profilePicture || null,
    xcard: data.xcard === true,
    offerTypes,
    hasBuyOneGetOne: offerTypes.includes("buy1get1"),
    hasStudentDeal: Array.isArray(data.offers) && data.offers.length > 0,
    openingHours: data.openingHours || data.hours || null,
    searchTokens: Array.isArray(data.searchTokens) ? data.searchTokens : [],
    firstOffer,
    locations,
  };
}

/**
 * Build a stable map location document id.
 * @param {string} vendorId
 * @param {string} locationId
 * @return {string}
 */
function mapLocationDocId(vendorId: string, locationId: string) {
  return `${vendorId}_${locationId.replace(/[/\s]+/g, "_")}`;
}

/**
 * Decide whether a vendor should appear in the public map index.
 * @param {FirebaseFirestore.DocumentData} data
 * @return {boolean}
 */
function shouldIndexMapVendor(data: FirebaseFirestore.DocumentData) {
  const vendorType = typeof data.vendorType === "string" ?
    data.vendorType :
    "in_store";
  const status = typeof data.status === "string" ? data.status : null;

  if (vendorType === "online") return false;
  if (status && status.toLowerCase() === "inactive") return false;

  return true;
}

/**
 * Build per-branch map index documents from a vendor document.
 * @param {string} vendorId
 * @param {FirebaseFirestore.DocumentData} data
 * @return {VendorMapLocationDoc[]}
 */
function buildMapLocationDocs(
  vendorId: string,
  data: FirebaseFirestore.DocumentData,
): VendorMapLocationDoc[] {
  if (!shouldIndexMapVendor(data)) return [];

  const entry = buildMapEntry(data);
  if (!entry) return [];

  return entry.locations.map((location) => {
    const fullGeohash = geohashForLocation([
      location.latitude,
      location.longitude,
    ]);

    return {
      vendorId,
      locationId: location.id,
      name: entry.name,
      nameAr: entry.nameAr,
      vendorName: entry.vendorName,
      vendorNameAr: entry.vendorNameAr,
      branchName: location.name,
      branchNameAr: location.nameAr,
      phoneNumber: location.phoneNumber,
      latitude: location.latitude,
      longitude: location.longitude,
      geohash: fullGeohash,
      geohash4: fullGeohash.slice(0, 4),
      geohash5: fullGeohash.slice(0, 5),
      geohash6: fullGeohash.slice(0, 6),
      address: location.address,
      addressAr: location.addressAr,
      mainCategory: entry.mainCategory,
      profilePicture: entry.profilePicture,
      vendorType: typeof data.vendorType === "string" ? data.vendorType : null,
      status: typeof data.status === "string" ? data.status : null,
      isActive: typeof data.status === "string" ?
        data.status.toLowerCase() !== "inactive" :
        true,
      xcard: entry.xcard,
      offerTypes: entry.offerTypes,
      hasBuyOneGetOne: entry.hasBuyOneGetOne,
      hasStudentDeal: entry.hasStudentDeal,
      openingHours: entry.openingHours,
      searchTokens: entry.searchTokens,
      firstOffer: entry.firstOffer,
      isPrimary: location.isPrimary,
      updatedAt: FieldValue.serverTimestamp(),
    };
  });
}

/**
 * Replace all map index documents for a single vendor.
 * @param {string} vendorId
 * @param {VendorMapLocationDoc[]} locations
 */
async function replaceVendorMapLocationDocs(
  vendorId: string,
  locations: VendorMapLocationDoc[],
) {
  const db = getFirestore();
  const existing = await db.collection("mapLocations")
    .where("vendorId", "==", vendorId)
    .get();
  const batch = db.batch();

  existing.docs.forEach((doc) => batch.delete(doc.ref));
  locations.forEach((location) => {
    const ref = db.collection("mapLocations").doc(
      mapLocationDocId(vendorId, location.locationId),
    );
    batch.set(ref, location);
  });

  if (existing.size > 0 || locations.length > 0) {
    await batch.commit();
  }
}

// Helper: Generate a 4-char creator code candidate (2 letters + 2 digits)
const generateCreatorCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (chars: string) =>
    chars.charAt(Math.floor(Math.random() * chars.length));
  return pick(letters) + pick(letters) + pick(digits) + pick(digits);
};

// Shared student creation logic
interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  gender: string;
  dob: string;
  role: string;
  studentId?: string;
}

/**
 * Shared student creation logic
 * @param {CreateStudentInput} input - Student data
 * @return {Promise<{uid: string, creatorCode: string}>}
 */
async function doCreateStudentUser(input: CreateStudentInput) {
  const authAdmin = getAuth();
  const db = getFirestore();

  const {
    firstName, lastName, email, password, gender, dob, role, studentId,
  } = input;
  const finalFirstName = firstName || "Student";
  const finalLastName = lastName || "";
  const finalRole = role || "student";
  const finalGender = gender || "Unspecified";
  const finalDob = dob || new Date().toISOString().split("T")[0];

  const userConfig: {
    email: string;
    displayName: string;
    emailVerified: boolean;
    password: string;
  } = {
    email,
    displayName: `${finalFirstName} ${finalLastName}`.trim(),
    emailVerified: true,
    password: password ||
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10),
  };

  const user = await authAdmin.createUser(userConfig);

  const studentData: {
    firstName: string;
    lastName: string;
    email: string;
    gender: string;
    dob: string;
    uid: string;
    role: string;
    cashback: number;
    createdAt: Date;
    updatedAt: Date;
    creatorCode?: string;
    savings?: number;
    studentId?: string;
  } = {
    firstName: finalFirstName,
    lastName: finalLastName,
    email,
    gender: finalGender,
    dob: finalDob,
    uid: user.uid,
    role: finalRole,
    cashback: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (studentId) {
    studentData.studentId = studentId;
  }

  let creatorCode = "";
  try {
    if (finalRole === "creator") {
      const maxAttempts = 10;
      const studentRef = db.collection("students").doc(user.uid);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = generateCreatorCode();
        const codeRef = db.collection("creator_codes").doc(candidate);
        const reserved = await db.runTransaction(async (transaction) => {
          const codeDoc = await transaction.get(codeRef);
          if (codeDoc.exists) {
            return false;
          }

          transaction.create(studentRef, {
            ...studentData,
            creatorCode: candidate,
            savings: 0,
          });
          transaction.create(codeRef, {
            uid: user.uid,
            createdAt: new Date(),
          });
          return true;
        });

        if (reserved) {
          creatorCode = candidate;
          break;
        }
      }

      if (!creatorCode) {
        throw new HttpsError(
          "resource-exhausted",
          "Unable to reserve a unique creator code",
        );
      }
    } else {
      await db.collection("students").doc(user.uid).create(studentData);
    }
  } catch (error) {
    try {
      await authAdmin.deleteUser(user.uid);
    } catch (cleanupError) {
      logger.error("Failed to clean up Auth user after student write failure", {
        uid: user.uid,
        cleanupError,
      });
    }
    throw error;
  }

  logger.info("Student created", {
    studentId: user.uid,
    role: finalRole,
    creatorCode: creatorCode || "N/A",
  });

  return {uid: user.uid, creatorCode};
}

export const createVendorUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
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
      status: "Active",
      createdAt: new Date(),
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

export const deleteVendorUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {uid} = data;

    // 3️⃣ Validate input
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "vendor uid is required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Delete Auth user
    try {
      await authAdmin.deleteUser(uid);
    } catch (error) {
      logger.error("Error deleting Auth user", {uid, error});
      // Continue to delete Firestore document even if Auth user is already gone
    }

    // 5️⃣ Delete vendor Firestore document
    await db.collection("vendors").doc(uid).delete();

    // 6️⃣ Delete vendor gallery images
    try {
      await getStorage().bucket().deleteFiles({
        prefix: `vendors/${uid}/gallery/`,
      });
    } catch (error) {
      logger.error("Error deleting vendor gallery images", {uid, error});
    }

    logger.info("Vendor deleted", {
      vendorId: uid,
    });

    return {
      success: true,
    };
  }
);

export const listHoldingGroups = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    requireAdmin(request);
    const db = getFirestore();
    const [groupsSnap, usersSnap] = await Promise.all([
      db.collection("holdingGroups").orderBy("name", "asc").get(),
      db.collection("holdingGroupUsers").get(),
    ]);
    const usersByGroup = new Map<string, unknown[]>();
    usersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const groupId = data.groupId;
      if (typeof groupId !== "string") {
        return;
      }
      const users = usersByGroup.get(groupId) || [];
      users.push({
        uid: docSnap.id,
        email: data.email || "",
        displayName: data.displayName || "",
        role: data.role || "viewer",
        status: data.status || "disabled",
      });
      usersByGroup.set(groupId, users);
    });
    const groups = groupsSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      const vendorIds = Array.isArray(data.vendorIds) ? data.vendorIds : [];
      return {
        id: docSnap.id,
        name: data.name || "Unnamed Group",
        status: data.status || "disabled",
        vendorIds,
        users: usersByGroup.get(docSnap.id) || [],
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt),
      };
    });
    return {groups};
  }
);

export const createHoldingGroup = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const name = parseRequiredString(request.data?.name, "name");
    const vendorIds = parseHoldingVendorIds(request.data?.vendorIds || []);
    await assertVendorsExist(vendorIds);

    const db = getFirestore();
    const groupRef = db.collection("holdingGroups").doc();
    await groupRef.set({
      name,
      status: "active",
      vendorIds,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid,
      updatedBy: adminUid,
    });
    logger.info("Holding group created", {
      groupId: groupRef.id,
      vendorCount: vendorIds.length,
      adminUid,
    });
    return {groupId: groupRef.id, success: true};
  }
);

export const updateHoldingGroup = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const groupId = parseRequiredString(request.data?.groupId, "groupId");
    const name = parseOptionalString(request.data?.name, "name");
    const status = request.data?.status;
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    };

    if (name !== undefined) {
      update.name = name;
    }
    if (status !== undefined) {
      if (status !== "active" && status !== "disabled") {
        throw new HttpsError(
          "invalid-argument",
          "status must be active or disabled"
        );
      }
      update.status = status;
    }
    if (request.data?.vendorIds !== undefined) {
      const vendorIds = parseHoldingVendorIds(request.data.vendorIds);
      await assertVendorsExist(vendorIds);
      update.vendorIds = vendorIds;
    }

    const db = getFirestore();
    const groupRef = db.collection("holdingGroups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      throw new HttpsError("not-found", "Holding group not found");
    }
    await groupRef.update(update);
    logger.info("Holding group updated", {groupId, adminUid});
    return {success: true};
  }
);

export const createHoldingGroupUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const groupId = parseRequiredString(request.data?.groupId, "groupId");
    const email = parseRequiredString(request.data?.email, "email");
    const password = parseRequiredString(request.data?.password, "password");
    const displayName = parseRequiredString(
      request.data?.displayName,
      "displayName"
    );
    const role = request.data?.role || "viewer";
    if (role !== "owner" && role !== "viewer") {
      throw new HttpsError("invalid-argument", "role must be owner or viewer");
    }

    const db = getFirestore();
    const groupSnap = await db.collection("holdingGroups").doc(groupId).get();
    if (!groupSnap.exists) {
      throw new HttpsError("not-found", "Holding group not found");
    }

    const authAdmin = getAuth();
    const user = await authAdmin.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    await authAdmin.setCustomUserClaims(user.uid, {
      accountType: "holding_group",
    });
    await db.collection("holdingGroupUsers").doc(user.uid).set({
      groupId,
      email,
      displayName,
      role,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid,
      updatedBy: adminUid,
    });
    logger.info("Holding group user created", {
      uid: user.uid,
      groupId,
      adminUid,
    });
    return {uid: user.uid, success: true};
  }
);

export const disableHoldingGroupUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const uid = parseRequiredString(request.data?.uid, "uid");
    const db = getFirestore();
    const userRef = db.collection("holdingGroupUsers").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "Holding user not found");
    }
    await Promise.all([
      userRef.update({
        status: "disabled",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminUid,
      }),
      getAuth().updateUser(uid, {disabled: true}),
    ]);
    logger.info("Holding group user disabled", {uid, adminUid});
    return {success: true};
  }
);

export const deleteHoldingGroupUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const uid = parseRequiredString(request.data?.uid, "uid");
    const db = getFirestore();
    await Promise.allSettled([
      getAuth().deleteUser(uid),
      db.collection("holdingGroupUsers").doc(uid).delete(),
    ]);
    logger.info("Holding group user deleted", {uid, adminUid});
    return {success: true};
  }
);

export const getMyHoldingProfile = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const uid = requireAuthUid(request);
    const access = await getActiveHoldingAccess(uid);
    const vendors = await getHoldingVendorSummaries(access.vendorIds);
    return {
      uid,
      groupId: access.groupId,
      groupName: access.group.name,
      role: access.user.role,
      status: access.user.status,
      vendorIds: access.vendorIds,
      vendors,
    };
  }
);

export const getHoldingDashboard = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const uid = requireAuthUid(request);
    const access = await getActiveHoldingAccess(uid);
    const range = request.data?.range || "7d";
    if (range !== "7d" && range !== "30d" && range !== "90d") {
      throw new HttpsError("invalid-argument", "Unsupported range");
    }
    const vendorIds = access.vendorIds;
    const vendors = await getHoldingVendorSummaries(vendorIds);
    const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    const daily: Record<string, {
      date: string;
      redemptions: number;
      revenue: number;
    }> = {};
    for (let i = rangeDays - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().split("T")[0];
      daily[key] = {date: key, redemptions: 0, revenue: 0};
    }
    const totals = {
      totalRevenue: 0,
      totalRedemptions: 0,
      totalDiscount: 0,
      pendingTransactions: 0,
      activeOffers: vendors.reduce((sum, vendor) => sum + vendor.activeOffers, 0),
    };
    const breakdown = new Map(vendors.map((vendor) => [vendor.id, {
      vendorId: vendor.id,
      vendorName: vendor.name,
      totalRevenue: 0,
      totalRedemptions: 0,
      totalDiscount: 0,
      pendingTransactions: 0,
      activeOffers: vendor.activeOffers,
    }]));

    if (vendorIds.length) {
      const db = getFirestore();
      const snapshot = await db.collection("transactions")
        .where("vendorId", "in", vendorIds)
        .get();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const vendorId = data.vendorId;
        const vendorStats = breakdown.get(vendorId);
        if (!vendorStats) {
          return;
        }
        if (data.status === "pending") {
          totals.pendingTransactions += 1;
          vendorStats.pendingTransactions += 1;
        }
        if (data.status !== "completed") {
          return;
        }
        const finalAmount = Number(data.finalAmount || 0);
        const discountAmount = Number(data.discountAmount || 0);
        totals.totalRevenue += finalAmount;
        totals.totalDiscount += discountAmount;
        totals.totalRedemptions += 1;
        vendorStats.totalRevenue += finalAmount;
        vendorStats.totalDiscount += discountAmount;
        vendorStats.totalRedemptions += 1;
        const createdAt = data.createdAt;
        if (createdAt instanceof Timestamp && createdAt.toDate() >= startDate) {
          const key = createdAt.toDate().toISOString().split("T")[0];
          if (daily[key]) {
            daily[key].redemptions += 1;
            daily[key].revenue += finalAmount;
          }
        }
      });
    }

    return {
      groupId: access.groupId,
      groupName: access.group.name,
      totals,
      chartData: Object.values(daily),
      vendors: Array.from(breakdown.values()),
    };
  }
);

export const listHoldingTransactions = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const uid = requireAuthUid(request);
    const access = await getActiveHoldingAccess(uid);
    const pageSizeInput = request.data?.pageSize ?? 50;
    if (
      typeof pageSizeInput !== "number" ||
      !Number.isInteger(pageSizeInput) ||
      pageSizeInput < 1 ||
      pageSizeInput > HOLDING_TRANSACTION_MAX_PAGE_SIZE
    ) {
      throw new HttpsError(
        "invalid-argument",
        `pageSize must be from 1 to ${HOLDING_TRANSACTION_MAX_PAGE_SIZE}`
      );
    }
    const vendorId = parseOptionalString(request.data?.vendorId, "vendorId");
    const cursor = decodeHoldingCursor(request.data?.cursor);
    let vendorIds = access.vendorIds;
    if (vendorId) {
      if (!vendorIds.includes(vendorId)) {
        throw new HttpsError("permission-denied", "Vendor is not assigned");
      }
      vendorIds = [vendorId];
    }
    if (!vendorIds.length) {
      return {transactions: [], nextCursor: null};
    }

    const db = getFirestore();
    let txQuery: FirebaseFirestore.Query = db.collection("transactions")
      .where("vendorId", "in", vendorIds)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (cursor) {
      txQuery = txQuery.startAfter(
        Timestamp.fromMillis(cursor.createdAtMillis),
        cursor.id
      );
    }
    const snapshot = await txQuery.limit(pageSizeInput + 1).get();
    const pageDocs = snapshot.docs.slice(0, pageSizeInput);
    const transactions = pageDocs.map(mapTransactionSnapshot);
    const nextDoc = snapshot.docs.length > pageSizeInput ?
      snapshot.docs[pageSizeInput - 1] :
      null;
    const nextCursor = nextDoc ? encodeHoldingCursor({
      createdAtMillis: timestampToMillis(nextDoc.data().createdAt),
      id: nextDoc.id,
    }) : null;
    return {transactions, nextCursor};
  }
);

export const getHoldingTransaction = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const uid = requireAuthUid(request);
    const access = await getActiveHoldingAccess(uid);
    const transactionId = parseRequiredString(
      request.data?.transactionId,
      "transactionId"
    );
    const snapshot = await getFirestore()
      .collection("transactions")
      .doc(transactionId)
      .get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Transaction not found");
    }
    const data = snapshot.data() || {};
    if (!access.vendorIds.includes(data.vendorId)) {
      throw new HttpsError("permission-denied", "Transaction is not assigned");
    }
    return {transaction: mapTransactionSnapshot(snapshot)};
  }
);

export const deleteTransaction = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const adminUid = requireAdmin(request);
    const transactionId = parseRequiredString(
      request.data?.transactionId,
      "transactionId"
    );
    const transactionRef = getFirestore()
      .collection("transactions")
      .doc(transactionId);

    try {
      const snapshot = await transactionRef.get();
      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Transaction not found");
      }

      await transactionRef.delete();

      logger.info("Transaction deleted", {
        adminUid,
        transactionId,
      });

      return {success: true as const};
    } catch (error) {
      if (error instanceof HttpsError) {
        logger.error("Transaction delete rejected", {
          adminUid,
          transactionId,
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      logger.error("Transaction delete failed", {
        adminUid,
        transactionId,
        error,
      });
      throw new HttpsError("internal", "Failed to delete transaction");
    }
  }
);

export const createStudentUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {firstName, lastName, email, password, gender, dob, role} = data;

    if (!email) {
      throw new HttpsError("invalid-argument", "email is required");
    }

    const result = await doCreateStudentUser({
      firstName, lastName, email, password, gender, dob, role,
    });

    return {uid: result.uid, creatorCode: result.creatorCode, success: true};
  }
);

export const deleteStudentUser = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {uid} = data;

    // 3️⃣ Validate input
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "student uid is required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Delete Auth user
    try {
      await authAdmin.deleteUser(uid);
    } catch (error) {
      logger.error("Error deleting Auth user", {uid, error});
      // Delete Firestore docs even if Auth user is already gone
    }

    // 5️⃣ Delete student Firestore document
    await db.collection("students").doc(uid).delete();

    // 6️⃣ Delete related transactions
    const transactionsSnapshot = await db
      .collection("transactions")
      .where("userId", "==", uid)
      .get();

    const batch = db.batch();
    transactionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    if (transactionsSnapshot.size > 0) {
      await batch.commit();
    }

    logger.info("Student deleted", {
      studentId: uid,
      transactionsDeleted: transactionsSnapshot.size,
    });

    return {
      success: true,
    };
  }
);

export const approveVerificationRequest = onCall(
  {region: REGION, cors: true, secrets: ["RESEND_API_KEY"]},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId, firstName, lastName,
      gender, dob, role, studentId} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    const db = getFirestore();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Request has already been reviewed"
      );
    }

    const email = requestData.email;

    // Create student account
    const result = await doCreateStudentUser({
      firstName: firstName || "Student",
      lastName: lastName || "",
      email,
      password: undefined,
      gender: gender || "Unspecified",
      dob: dob || new Date().toISOString().split("T")[0],
      role: role || "student",
      studentId: studentId || undefined,
    });

    // Update verification request
    await reqDoc.update({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: auth.uid,
      authUid: result.uid,
    });

    // Delete ID images from Storage
    const bucket = getStorage().bucket();
    const deleteFile = async (filePath: string) => {
      if (filePath) {
        try {
          await bucket.file(filePath).delete();
        } catch (err) {
          logger.warn("Failed to delete storage file", {filePath, error: err});
        }
      }
    };
    await deleteFile(requestData?.idImagePath);

    // Send welcome email via Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const displayName = `${firstName || "Student"} ${lastName || ""}`.trim();

      await resend.emails.send({
        from: "realX <welcome@realx.qa>",
        to: email,
        subject: "Your realX Account is Ready!",
        html: [
          "<div style=\"font-family: Arial, sans-serif;",
          "  max-width: 600px; margin: 0 auto;\">",
          "  <h1 style=\"color: #16a34a;\">Welcome to RealX!</h1>",
          `  <p>Hi ${displayName},</p>`,
          "  <p>Your verification has been approved",
          "    and your RealX account is now ready.</p>",
          "  <p>You can log in using your email:",
          `    <strong>${email}</strong></p>`,
          "  <p style=\"margin-top: 24px;\">",
          "    Best regards,<br>The realX Team</p>",
          "</div>",
        ].join("\n"),
      });
      logger.info("Welcome email sent", {email});
    } catch (emailError) {
      logger.error("Failed to send welcome email", {email, error: emailError});
      // Don't fail the whole operation if email fails
    }

    logger.info("Verification request approved", {
      verificationRequestId,
      studentUid: result.uid,
    });

    return {
      uid: result.uid,
      creatorCode: result.creatorCode,
      success: true,
    };
  }
);

export const rejectVerificationRequest = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId, rejectionReason} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    if (!rejectionReason) {
      throw new HttpsError(
        "invalid-argument",
        "rejectionReason is required"
      );
    }

    const db = getFirestore();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Request has already been reviewed"
      );
    }

    await reqDoc.update({
      status: "rejected",
      rejectionReason,
      reviewedAt: new Date(),
      reviewedBy: auth.uid,
    });

    // Delete ID images from Storage
    const bucket = getStorage().bucket();
    const deleteFile = async (filePath: string) => {
      if (filePath) {
        try {
          await bucket.file(filePath).delete();
        } catch (err) {
          logger.warn("Failed to delete storage file", {filePath, error: err});
        }
      }
    };
    await deleteFile(requestData?.idImagePath);

    logger.info("Verification request rejected", {verificationRequestId});

    return {success: true};
  }
);

export const deleteVerificationRequest = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();

    // Delete ID images from Storage
    const deleteFile = async (filePath: string) => {
      if (filePath) {
        try {
          await bucket.file(filePath).delete();
        } catch (err) {
          logger.warn("Failed to delete storage file", {filePath, error: err});
        }
      }
    };

    await deleteFile(requestData?.idImagePath);

    // Delete the Firestore document
    await reqDoc.delete();

    logger.info("Verification request deleted", {verificationRequestId});

    return {success: true};
  }
);

export const backfillVendorGeohashes = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const snapshot = await db.collection("vendors").get();
    logger.info("Geohash backfill vendor scan complete", {
      vendorsScanned: snapshot.size,
    });

    let updatedCount = 0;
    const BATCH_LIMIT = 500;
    let batch = db.batch();
    let batchCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const lat = data.latitude;
      const lng = data.longitude;

      if (
        typeof lat === "number" && !isNaN(lat) &&
        typeof lng === "number" && !isNaN(lng) &&
        !data.geohash
      ) {
        const hash = geohashForLocation([lat, lng]);
        batch.update(doc.ref, {geohash: hash});
        updatedCount++;
        batchCount++;

        if (batchCount >= BATCH_LIMIT) {
          batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    logger.info("Geohash backfill complete", {
      vendorsScanned: snapshot.size,
      updatedCount,
    });

    return {success: true, updatedCount};
  }
);

/**
 * Firestore trigger: auto-sync maps/locations whenever a vendor doc changes.
 * Keeps a single cached document with all active vendor locations
 * keyed by vendorId.
 */
export const onVendorWrite = onDocumentWritten(
  {document: "vendors/{vendorId}", region: REGION},
  async (event) => {
    const vendorId = event.params.vendorId;
    const db = getFirestore();
    const locationsRef = db.collection("maps").doc("locations");

    // Vendor was deleted or has no data
    if (!event.data?.after?.exists) {
      await replaceVendorMapLocationDocs(vendorId, []);
      await locationsRef.set(
        {[vendorId]: FieldValue.delete()},
        {merge: true},
      );
      logger.info("Removed vendor from map indexes", {vendorId});
      return;
    }

    const data = event.data.after.data();
    if (!data) return;
    const entry = buildMapEntry(data);
    const locationDocs = buildMapLocationDocs(vendorId, data);
    await replaceVendorMapLocationDocs(vendorId, locationDocs);

    if (entry) {
      await locationsRef.set(
        {[vendorId]: entry},
        {merge: true},
      );
      logger.info("Updated vendor in map indexes", {
        vendorId,
        locationCount: locationDocs.length,
      });
    } else {
      // Vendor exists but isn't mappable (inactive or no coordinates)
      await locationsRef.set(
        {[vendorId]: FieldValue.delete()},
        {merge: true},
      );
      logger.info("Removed unmappable vendor from map indexes", {vendorId});
    }
  },
);

/**
 * Admin callable: rebuild the entire maps/locations document from scratch.
 * Useful for initial seeding or fixing inconsistencies.
 */
export const rebuildLocationsCache = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const [snapshot, existingLocationsSnapshot] = await Promise.all([
      db.collection("vendors").get(),
      db.collection("mapLocations").get(),
    ]);
    logger.info("Locations cache rebuild vendor scan complete", {
      vendorsScanned: snapshot.size,
      oldLocationDocsScanned: existingLocationsSnapshot.size,
    });

    const vendors: Record<string, VendorMapEntry> = {};
    let count = 0;
    let locationCount = 0;
    let mapLocationBatch = db.batch();
    let mapLocationBatchCount = 0;
    const commitMapLocationBatch = async () => {
      if (mapLocationBatchCount === 0) return;
      await mapLocationBatch.commit();
      mapLocationBatch = db.batch();
      mapLocationBatchCount = 0;
    };

    for (const locationDoc of existingLocationsSnapshot.docs) {
      mapLocationBatch.delete(locationDoc.ref);
      mapLocationBatchCount++;
      if (mapLocationBatchCount >= 450) await commitMapLocationBatch();
    }

    for (const doc of snapshot.docs) {
      const entry = buildMapEntry(doc.data());
      if (entry) {
        vendors[doc.id] = entry;
        count++;
      }

      const locationDocs = buildMapLocationDocs(doc.id, doc.data());
      for (const locationDoc of locationDocs) {
        const ref = db.collection("mapLocations").doc(
          mapLocationDocId(doc.id, locationDoc.locationId),
        );
        mapLocationBatch.set(ref, locationDoc);
        mapLocationBatchCount++;
        locationCount++;
        if (mapLocationBatchCount >= 450) {
          await commitMapLocationBatch();
        }
      }
    }

    await db.collection("maps").doc("locations").set(vendors);
    await commitMapLocationBatch();

    logger.info("Locations cache rebuilt", {
      vendorsScanned: snapshot.size,
      vendorCount: count,
      locationCount,
    });

    return {success: true, vendorCount: count, locationCount};
  },
);

/**
 * Admin callable: rebuild the scalable per-location map index.
 * Keeps maps/locations untouched; use rebuildLocationsCache to rebuild both.
 */
export const rebuildMapLocationIndex = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const [vendorsSnapshot, existingLocationsSnapshot] = await Promise.all([
      db.collection("vendors").get(),
      db.collection("mapLocations").get(),
    ]);
    logger.info("Map location index rebuild scans complete", {
      vendorsScanned: vendorsSnapshot.size,
      oldLocationDocsScanned: existingLocationsSnapshot.size,
    });

    let batch = db.batch();
    let batchCount = 0;
    let locationCount = 0;
    const commitBatch = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };

    for (const locationDoc of existingLocationsSnapshot.docs) {
      batch.delete(locationDoc.ref);
      batchCount++;
      if (batchCount >= 450) await commitBatch();
    }

    for (const vendorDoc of vendorsSnapshot.docs) {
      const locationDocs = buildMapLocationDocs(vendorDoc.id, vendorDoc.data());
      for (const locationDoc of locationDocs) {
        const ref = db.collection("mapLocations").doc(
          mapLocationDocId(vendorDoc.id, locationDoc.locationId),
        );
        batch.set(ref, locationDoc);
        batchCount++;
        locationCount++;
        if (batchCount >= 450) await commitBatch();
      }
    }

    await commitBatch();

    logger.info("Map location index rebuilt", {
      vendorsScanned: vendorsSnapshot.size,
      locationCount,
    });

    return {
      success: true,
      vendorsScanned: vendorsSnapshot.size,
      locationCount,
    };
  },
);
