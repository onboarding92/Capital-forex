import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { getDb } from "./db";
import { webAuthnCredentials, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// WebAuthn Configuration
const RP_NAME = "BitChange Pro";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

/**
 * Generate registration options for a new WebAuthn credential
 */
export async function generateWebAuthnRegistrationOptions(
  userId: number,
  userEmail: string,
  userName: string
) {
  // Get existing credentials for this user
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const existingCredentials = await db
    .select()
    .from(webAuthnCredentials)
    .where(eq(webAuthnCredentials.userId, userId));

  const opts: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: userEmail,
    userDisplayName: userName || userEmail,
    // Timeout after 5 minutes
    timeout: 300000,
    // Prevent re-registration of existing credentials
    excludeCredentials: existingCredentials.map((cred: any) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    // Support both algorithms
    supportedAlgorithmIDs: [-7, -257],
  };

  const options = await generateRegistrationOptions(opts);

  return {
    options,
    // Store challenge temporarily (in production, use Redis or session)
    challenge: options.challenge,
  };
}

/**
 * Verify and save a new WebAuthn credential
 */
export async function verifyAndSaveWebAuthnCredential(
  userId: number,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string
) {
  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  };

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse(opts);
  } catch (error: any) {
    console.error("WebAuthn registration verification failed:", error);
    throw new Error(`Registration verification failed: ${error.message}`);
  }

  const { verified, registrationInfo } = verification;

  if (!verified || !registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const {
    credential: regCredential,
    aaguid,
  } = registrationInfo;
  
  const { id: credentialID, publicKey: credentialPublicKey, counter } = regCredential;

  // Save credential to database
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const [savedCredential] = await db.insert(webAuthnCredentials).values({
    userId,
    credentialId: Buffer.from(credentialID).toString("base64url"),
    publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
    counter,
    deviceName: deviceName || "Unnamed Device",
    deviceType: "platform",
    transports: JSON.stringify(response.response.transports || []),
    aaguid,
    lastUsed: new Date(),
  });

  return {
    verified: true,
    credentialId: Buffer.from(credentialID).toString("base64url"),
  };
}

/**
 * Generate authentication options for WebAuthn login
 */
export async function generateWebAuthnAuthenticationOptions(userId?: number) {
  let allowCredentials: Array<{
    id: string;
    transports?: AuthenticatorTransport[];
  }> = [];

  // If userId provided, get their credentials
  if (userId) {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const userCredentials = await db
      .select()
      .from(webAuthnCredentials)
      .where(eq(webAuthnCredentials.userId, userId));

    allowCredentials = userCredentials.map((cred: any) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    }));
  }

  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: RP_ID,
    timeout: 300000,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: "preferred",
  };

  const options = await generateAuthenticationOptions(opts);

  return {
    options,
    challenge: options.challenge,
  };
}

/**
 * Verify WebAuthn authentication response
 */
export async function verifyWebAuthnAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  // Find the credential
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const credentialIdBase64 = Buffer.from(response.rawId, "base64url").toString(
    "base64url"
  );

  const [credential] = await db
    .select()
    .from(webAuthnCredentials)
    .where(eq(webAuthnCredentials.credentialId, credentialIdBase64));

  if (!credential) {
    throw new Error("Credential not found");
  }

  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.credentialId,
      publicKey: Buffer.from(credential.publicKey, "base64url"),
      counter: credential.counter,
    },
    requireUserVerification: true,
  };

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse(opts);
  } catch (error: any) {
    console.error("WebAuthn authentication verification failed:", error);
    throw new Error(`Authentication verification failed: ${error.message}`);
  }

  const { verified, authenticationInfo } = verification;

  if (!verified) {
    throw new Error("Authentication verification failed");
  }

  // Update counter and last used timestamp
  await db
    .update(webAuthnCredentials)
    .set({
      counter: authenticationInfo.newCounter,
      lastUsed: new Date(),
    })
    .where(eq(webAuthnCredentials.id, credential.id));

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, credential.userId));

  if (!user) {
    throw new Error("User not found");
  }

  return {
    verified: true,
    userId: credential.userId,
    user,
    credentialId: credential.id,
  };
}

/**
 * List all credentials for a user
 */
export async function listUserWebAuthnCredentials(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const credentials = await db
    .select({
      id: webAuthnCredentials.id,
      deviceName: webAuthnCredentials.deviceName,
      deviceType: webAuthnCredentials.deviceType,
      lastUsed: webAuthnCredentials.lastUsed,
      createdAt: webAuthnCredentials.createdAt,
    })
    .from(webAuthnCredentials)
    .where(eq(webAuthnCredentials.userId, userId));

  return credentials;
}

/**
 * Delete a WebAuthn credential
 */
export async function deleteWebAuthnCredential(userId: number, credentialId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const result = await db
    .delete(webAuthnCredentials)
    .where(
      and(
        eq(webAuthnCredentials.id, credentialId),
        eq(webAuthnCredentials.userId, userId)
      )
    );

  return { success: true };
}
