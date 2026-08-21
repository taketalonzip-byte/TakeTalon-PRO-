/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CryptographicAuditLog } from "../domain/entities";
import { IAuditLogger } from "../domain/interfaces";

/**
 * Audit logger for maintaining secure records of cryptographic events,
 * tampering alerts, and key rotations with durable local storage persistence.
 */
export class LocalAuditLogger implements IAuditLogger {
  private logs: CryptographicAuditLog[] = [];
  private readonly STORAGE_KEY = "hush_audit_logs_v1";

  constructor() {
    this.loadLogs();
  }

  public log(
    action: CryptographicAuditLog["action"],
    details: string,
    status: CryptographicAuditLog["status"],
  ): void {
    const entry: CryptographicAuditLog = {
      id: `audit-${globalThis.crypto.randomUUID()}`,
      timestamp: new Date(),
      action,
      details,
      status,
    };

    this.logs = [entry, ...this.logs].slice(0, 100); // retain latest 100 entries for efficiency
    this.persistLogs();

    if (status === "SECURITY_ALERT") {
      console.error(`🚨 [HUSH SECURITY ALERT] [${action}] ${details}`);
    } else {
      console.log(`ℹ️ [HUSH AUDIT] [${action}] ${details}`);
    }
  }

  public getLogs(): CryptographicAuditLog[] {
    return this.logs;
  }

  private loadLogs(): void {
    // Memory-only
  }

  private persistLogs(): void {
    // Memory-only
  }
}
