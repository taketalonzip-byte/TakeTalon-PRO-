/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICryptoService } from "../domain/interfaces";

/**
 * Enterprise-grade implementation of ICryptoService utilizing native Web Crypto standard API.
 * Compatible with modern browsers, Node.js (v15+), and serverless runtime environments.
 */
export class WebCryptoService implements ICryptoService {
  /**
   * Generates a cryptographically secure random hexadecimal string (CSPRNG).
   */
  public generateSecureRandomHex(bytes: number): string {
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Computes high-performance SHA-256 hash of a string.
   */
  public async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Computes HMAC-SHA256 signature using a raw string secret key and message.
   */
  public async hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(key);
    const msgBuffer = encoder.encode(message);

    // Import key for HMAC-SHA256 operations
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "HMAC",
        hash: { name: "SHA-256" },
      },
      false, // non-extractable for runtime safety
      ["sign"],
    );

    // Compute cryptographic HMAC signature
    const signatureBuffer = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, msgBuffer);

    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
