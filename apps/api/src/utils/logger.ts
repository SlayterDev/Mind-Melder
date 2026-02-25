/**
 * Structured logger for the Mind-Melder API.
 *
 * Log levels (ascending severity): debug < info < warn < error
 *
 * Control via environment variables:
 *   LOG_LEVEL=debug|info|warn|error   (default: info)
 *   NODE_ENV=production               (enables compact JSON output)
 *
 * Usage:
 *   const logger = createLogger('MyService');
 *   logger.info('Something happened', { userId, count: 5 });
 *   logger.error('Failed', { error: err.message });
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const ENV_LEVEL = ((process.env.LOG_LEVEL ?? 'info').toLowerCase()) as LogLevel;
const MIN_LEVEL: number = LOG_LEVELS[ENV_LEVEL] ?? LOG_LEVELS.info;
const IS_PROD = process.env.NODE_ENV === 'production';

// ANSI color codes — only applied in dev (non-production) when the output is a TTY
const ANSI = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
} as const;

const USE_COLOR =
  !IS_PROD &&
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: ANSI.cyan,
  info:  ANSI.green,
  warn:  ANSI.yellow,
  error: ANSI.red,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL;
}

/**
 * Serialize an unknown error value into a plain object safe for JSON.
 */
function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { raw: String(err) };
}

function buildEntry(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(meta ?? {}),
  };
}

function formatEntry(entry: Record<string, unknown>): string {
  if (IS_PROD) {
    return JSON.stringify(entry);
  }

  const { timestamp, level, context, message, ...rest } = entry;
  const lvl = level as LogLevel;
  const levelTag = String(lvl).toUpperCase().padEnd(5);
  const metaStr =
    Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';

  if (USE_COLOR) {
    const color = LEVEL_COLORS[lvl];
    return (
      `${ANSI.dim}${timestamp}${ANSI.reset} ` +
      `${color}${ANSI.bold}[${levelTag}]${ANSI.reset} ` +
      `${ANSI.dim}[${context}]${ANSI.reset} ` +
      `${color}${message}${ANSI.reset}` +
      `${ANSI.dim}${metaStr}${ANSI.reset}`
    );
  }

  return `${timestamp} [${levelTag}] [${context}] ${message}${metaStr}`;
}

function emit(level: LogLevel, entry: Record<string, unknown>): void {
  const line = formatEntry(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (level === 'debug') {
    console.debug(line);
  } else {
    console.info(line);
  }
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  /** Convenience: logs at error level with a serialized error object. */
  errorWithException(message: string, err: unknown, meta?: Record<string, unknown>): void;
}

/**
 * Create a logger scoped to a named context (service, route, etc.).
 *
 * @example
 *   const logger = createLogger('OrganizationService');
 */
export function createLogger(context: string): Logger {
  return {
    debug(message, meta) {
      if (shouldLog('debug')) emit('debug', buildEntry('debug', context, message, meta));
    },
    info(message, meta) {
      if (shouldLog('info')) emit('info', buildEntry('info', context, message, meta));
    },
    warn(message, meta) {
      if (shouldLog('warn')) emit('warn', buildEntry('warn', context, message, meta));
    },
    error(message, meta) {
      if (shouldLog('error')) emit('error', buildEntry('error', context, message, meta));
    },
    errorWithException(message, err, meta) {
      if (shouldLog('error')) {
        emit(
          'error',
          buildEntry('error', context, message, {
            ...meta,
            error: serializeError(err),
          })
        );
      }
    },
  };
}

/** Application-wide root logger. Use for startup/shutdown messages. */
export const logger = createLogger('App');
