/**
 * Encryption Utils
 * 
 * Provides utilities for secure handling of sensitive data.
 */

import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileExists } from './file.js';
import { printDebug, printWarning } from './logger.js';

/**
 * Get or generate encryption key
 * @param {boolean} [dryRun=false] Whether running in dry-run mode
 * @returns {Promise<string>} Encryption key
 */
export async function getEncryptionKey(dryRun = false) {
  const keyPath = path.join(os.homedir(), '.ai-assist-key');
  try {
    const exists = await fileExists(keyPath);
    if (exists) {
      return (await fs.readFile(keyPath, 'utf8')).trim();
    } else {
      if (dryRun) {
        printDebug('Would generate new encryption key');
        return 'dry-run-encryption-key';
      }
      
      const key = crypto.randomBytes(16).toString('hex');
      await fs.writeFile(keyPath, key, { mode: 0o600 });
      return key;
    }
  } catch (err) {
    printWarning('Failed to read or write encryption key. Using fallback method.');
    // Fallback to a hash of the hostname and username
    return crypto.createHash('sha256')
      .update(`${os.hostname()}-${os.userInfo().username}-aiAssistKeys`)
      .digest('hex');
  }
}

/**
 * Encrypt sensitive value
 * @param {string} value Value to encrypt
 * @param {string} key Encryption key
 * @param {boolean} [dryRun=false] Whether running in dry-run mode
 * @returns {string} Encrypted value
 */
export function encryptValue(value, key, dryRun = false) {
  if (dryRun) {
    return `encrypted:${value}`;
  }
  
  // This is a basic encryption for example purposes
  // In production, use a more secure method
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive value
 * @param {string} encrypted Encrypted value
 * @param {string} key Encryption key
 * @returns {string} Decrypted value
 */
export function decryptValue(encrypted, key) {
  if (encrypted.startsWith('encrypted:')) {
    // Handle dry run pseudo-encryption
    return encrypted.substring(10);
  }
  
  try {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    printWarning('Failed to decrypt value. Using empty string instead.');
    return '';
  }
}

export default {
  getEncryptionKey,
  encryptValue,
  decryptValue
};