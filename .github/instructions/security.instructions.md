<!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/security-and-owasp.instructions.md -->
---
applyTo: "**/*.ts,**/*.tsx,**/*.js"
description: "Security standards and OWASP best practices for Harmony desktop app"
---

# Security Best Practices for Harmony

## Core Security Principles

### Defense in Depth
- **Multiple security layers** - never rely on a single security control
- **Fail securely** - default to denying access when errors occur
- **Principle of least privilege** - grant minimum necessary permissions
- **Input validation** - validate all data at trust boundaries

### Electron-Specific Security

#### Process Isolation
- **Keep renderer processes isolated** - use contextIsolation: true
- **Disable node integration** in renderer processes
- **Use secure preload scripts** for IPC communication
- **Validate all IPC messages** between main and renderer processes

#### Content Security Policy
```typescript
// Implement strict CSP in renderer windows
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https:"
].join('; ');
```

#### File System Security
```typescript
// Validate and sanitize file paths
import { join, resolve } from 'path';

function validateFilePath(userPath: string, allowedDir: string): string {
  const resolvedPath = resolve(allowedDir, userPath);
  if (!resolvedPath.startsWith(resolve(allowedDir))) {
    throw new Error('Path traversal attempt detected');
  }
  return resolvedPath;
}
```

## Data Protection

### Input Validation & Sanitization
```typescript
// Validate all external input
interface TrackInput {
  title: string;
  artist?: string;
  filePath: string;
}

function validateTrackInput(input: unknown): TrackInput {
  if (typeof input !== 'object' || !input) {
    throw new Error('Invalid track input');
  }

  const { title, artist, filePath } = input as any;

  if (typeof title !== 'string' || title.length === 0) {
    throw new Error('Invalid track title');
  }

  if (artist !== undefined && typeof artist !== 'string') {
    throw new Error('Invalid artist name');
  }

  if (typeof filePath !== 'string' || !isValidPath(filePath)) {
    throw new Error('Invalid file path');
  }

  return { title, artist, filePath };
}
```

### Database Security
```typescript
// Use TypeORM parameterized queries (never string concatenation)
export class TrackRepository {
  async findByTitle(title: string): Promise<Track[]> {
    // GOOD: Parameterized query
    return this.repository.find({
      where: { title: Like(`%${title}%`) }
    });
  }

  async dangerousFind(title: string): Promise<Track[]> {
    // BAD: Never do this - SQL injection risk
    // return this.repository.query(`SELECT * FROM tracks WHERE title LIKE '%${title}%'`);
    throw new Error('Use parameterized queries only');
  }
}
```

### Sensitive Data Handling
```typescript
// Never store sensitive data in localStorage or global variables
class SecureStorage {
  private static store = new Map<string, string>();

  static setSecret(key: string, value: string): void {
    // Use Electron's safeStorage for sensitive data
    this.store.set(key, value);
  }

  static getSecret(key: string): string | undefined {
    return this.store.get(key);
  }

  static clearSecrets(): void {
    this.store.clear();
  }
}
```

## Cryptographic Security

### Strong Encryption Standards
```typescript
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Use strong, modern algorithms
export class CryptoUtils {
  static generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  static hashSensitiveData(data: string): string {
    // Use SHA-256 for non-password data hashing
    return createHash('sha256').update(data).digest('hex');
  }

  static secureCompare(a: string, b: string): boolean {
    // Prevent timing attacks
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    return bufferA.length === bufferB.length &&
           timingSafeEqual(bufferA, bufferB);
  }
}
```

### Secret Management
```typescript
// NEVER hardcode secrets
class ConfigManager {
  // BAD: Hardcoded API key
  // private static readonly API_KEY = "sk_12345_hardcoded_secret";

  // GOOD: Load from environment
  static getApiKey(): string {
    const key = process.env.MUSIC_API_KEY;
    if (!key) {
      throw new Error('MUSIC_API_KEY environment variable not set');
    }
    return key;
  }

  static getDatabaseUrl(): string {
    return process.env.DATABASE_URL || 'sqlite://./harmony.db';
  }
}
```

## Network Security

### External API Communication
```typescript
// Always use HTTPS for external requests
class MusicServiceClient {
  private readonly baseUrl = 'https://api.musicservice.com';
  private readonly timeout = 5000;

  async fetchTrackInfo(trackId: string): Promise<TrackInfo> {
    // Validate input to prevent SSRF
    if (!this.isValidTrackId(trackId)) {
      throw new Error('Invalid track ID format');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tracks/${encodeURIComponent(trackId)}`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${ConfigManager.getApiKey()}`,
          'User-Agent': 'Harmony/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log.error('Music service API error:', error);
      throw new Error('Failed to fetch track information');
    }
  }

  private isValidTrackId(trackId: string): boolean {
    // Only allow alphanumeric characters and hyphens
    return /^[a-zA-Z0-9-]+$/.test(trackId);
  }
}
```

### File Upload Security
```typescript
class FileHandler {
  private static readonly ALLOWED_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.m4a']);
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  static validateAudioFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();

    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`File type ${ext} not allowed`);
    }

    // Additional file size and content validation
    const stats = fs.statSync(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    return true;
  }
}
```

## Error Handling & Logging

### Secure Error Messages
```typescript
class SecureErrorHandler {
  static handleError(error: Error, context: string): void {
    // Log full error details internally
    log.error(`Error in ${context}:`, error);

    // Return sanitized error to user
    throw new Error(`An error occurred in ${context}. Check logs for details.`);
  }

  static sanitizeErrorForUser(error: Error): string {
    // Never expose internal implementation details
    if (error.message.includes('database') || error.message.includes('SQL')) {
      return 'A database error occurred. Please try again.';
    }

    if (error.message.includes('API key') || error.message.includes('authorization')) {
      return 'An authentication error occurred. Please check your settings.';
    }

    return 'An unexpected error occurred. Please try again.';
  }
}
```

### Audit Logging
```typescript
class AuditLogger {
  static logSecurityEvent(event: string, details: Record<string, any>): void {
    log.warn('SECURITY_EVENT', {
      timestamp: new Date().toISOString(),
      event,
      details: this.sanitizeLogData(details)
    });
  }

  private static sanitizeLogData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };

    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
```

## IPC Security

### Message Validation
```typescript
// Validate all IPC messages
export class IPCValidator {
  static validateTrackUpdate(data: unknown): TrackUpdateRequest {
    if (typeof data !== 'object' || !data) {
      throw new Error('Invalid IPC message format');
    }

    const { id, updates } = data as any;

    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Invalid track ID');
    }

    if (typeof updates !== 'object' || !updates) {
      throw new Error('Invalid track updates');
    }

    // Whitelist allowed update fields
    const allowedFields = ['title', 'artist', 'genre', 'rating'];
    const sanitizedUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    return { id, updates: sanitizedUpdates };
  }
}

// Use in IPC handlers
ipcMain.handle(channels.TRACK_UPDATE, async (event, data) => {
  try {
    const request = IPCValidator.validateTrackUpdate(data);
    const result = await trackService.update(request.id, request.updates);

    AuditLogger.logSecurityEvent('track_updated', { trackId: request.id });
    return { success: true, data: result };
  } catch (error) {
    AuditLogger.logSecurityEvent('track_update_failed', { error: error.message });
    return { success: false, error: SecureErrorHandler.sanitizeErrorForUser(error) };
  }
});
```

## Security Checklist

### Development Phase
- [ ] All IPC communication is validated and sanitized
- [ ] No secrets hardcoded in source code
- [ ] All file paths are validated to prevent traversal
- [ ] Database queries use parameterized statements
- [ ] External API calls use HTTPS only
- [ ] Error messages don't expose sensitive information
- [ ] Security headers are properly configured

### Testing Phase
- [ ] Test input validation with malicious payloads
- [ ] Test file upload restrictions
- [ ] Test IPC message validation
- [ ] Test error handling scenarios
- [ ] Verify sensitive data is not logged
- [ ] Test database injection resistance

### Production Phase
- [ ] All dependencies are scanned for vulnerabilities
- [ ] Security audit logs are monitored
- [ ] File permissions are properly restricted
- [ ] Network connections are encrypted
- [ ] Error reporting excludes sensitive data
- [ ] Regular security updates are applied

## Common Security Anti-Patterns

### Avoid These Patterns
```typescript
// BAD: Hardcoded secrets
const API_KEY = "sk_live_12345";

// BAD: SQL injection vulnerable
const query = `SELECT * FROM tracks WHERE title = '${userInput}'`;

// BAD: Path traversal vulnerable
const filePath = path.join(baseDir, userPath);

// BAD: Exposing internal errors
throw new Error(`Database connection failed: ${dbError.message}`);

// BAD: Unvalidated IPC data
ipcMain.handle('update-track', async (event, data) => {
  return await updateTrack(data); // No validation!
});
```

### Follow These Patterns
```typescript
// GOOD: Environment-based configuration
const API_KEY = process.env.API_KEY || (() => {
  throw new Error('API_KEY environment variable required');
})();

// GOOD: Parameterized queries
const tracks = await repository.find({ where: { title: Like(`%${userInput}%`) } });

// GOOD: Path validation
const safePath = validateFilePath(userPath, allowedDirectory);

// GOOD: Sanitized error messages
throw new Error('Track update failed. Please try again.');

// GOOD: Validated IPC handling
ipcMain.handle('update-track', async (event, data) => {
  const validatedData = IPCValidator.validateTrackUpdate(data);
  return await updateTrack(validatedData);
});
```
