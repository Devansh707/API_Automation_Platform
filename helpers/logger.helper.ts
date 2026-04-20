// =============================================================================
// FILE: helpers/logger.helper.ts
// PURPOSE: A simple, level-aware logger for printing test activity to the console.
//
// WHY NOT JUST USE console.log?
//   console.log always prints. In CI or production, you want quiet output —
//   only warnings and errors. In development, you want verbose debug output.
//   This logger lets you set a threshold: "only show messages at INFO or above".
//
// LOG LEVELS (lowest → highest):
//   debug → info → warn → error
//   If level is set to 'info', then debug messages are SILENCED automatically.
//
// HOW TO USE:
//   import { logger } from '../helpers/logger.helper';
//   logger.info('GET /posts');           ← shown in info/debug modes
//   logger.debug('Response: 200');       ← only shown in debug mode
//   logger.warn('Retrying request...');  ← shown in warn/info/debug modes
//   logger.error('Request failed', err); ← always shown
// =============================================================================

import { currentEnv } from '../config/environments';

// Map each level name to a number so we can compare them with >=
// "debug" is 0 (lowest), "error" is 3 (highest)
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

// Extract the type of the keys: 'debug' | 'info' | 'warn' | 'error'
// This is more maintainable than hardcoding the union type manually.
type LogLevel = keyof typeof LEVELS;

// ---------------------------------------------------------------------------
// Logger class — created once and exported as a singleton at the bottom.
// ---------------------------------------------------------------------------
class Logger {
  private level: LogLevel; // Minimum level to display

  // The constructor accepts an optional level (defaults to 'info').
  // The singleton at the bottom passes currentEnv.logLevel, so the
  // environment config controls verbosity automatically.
  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  // Decides whether a given message should be printed.
  // Example: if this.level = 'warn' (2), then:
  //   shouldLog('debug') → LEVELS['debug'](0) >= LEVELS['warn'](2) → false → silent
  //   shouldLog('error') → LEVELS['error'](3) >= LEVELS['warn'](2) → true  → printed
  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.level];
  }

  // Formats every log line consistently:
  // [2024-01-15T10:23:45.123Z] [INFO] GET /posts | {"userId":1}
  //  └─ ISO timestamp ──────┘  └─lvl┘  └─message┘  └─optional data─┘
  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    // If extra data was passed (e.g. a request body), serialize and append it.
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  // Public methods — one per level. Each checks shouldLog before printing.
  // The native console method matches the level: console.debug, .info, .warn, .error
  // so browser devtools and terminal tools can filter by level natively.

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) console.debug(this.format('debug', message, data));
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) console.info(this.format('info', message, data));
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) console.warn(this.format('warn', message, data));
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) console.error(this.format('error', message, data));
  }
}

// ---------------------------------------------------------------------------
// Singleton export — one logger instance shared by the entire framework.
// Its level is taken from currentEnv so it automatically adjusts per environment:
//   development → 'debug'  (verbose)
//   staging     → 'info'
//   ci          → 'info'
//   production  → 'warn'   (quiet)
// ---------------------------------------------------------------------------
export const logger = new Logger(currentEnv.logLevel);
