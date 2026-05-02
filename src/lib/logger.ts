type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;

function formatMessage(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  return context ? [base, context] : [base];
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (isDev) console.debug(...formatMessage('debug', message, context));
  },
  info: (message: string, context?: LogContext) => {
    if (isDev) console.info(...formatMessage('info', message, context));
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(...formatMessage('warn', message, context));
  },
  error: (message: string, error?: unknown, context?: LogContext) => {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error };
    console.error(...formatMessage('error', message, { ...context, ...errorData }));
  },
};

export default logger;
