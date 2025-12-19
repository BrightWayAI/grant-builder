// Rate limiting configuration
export const RATE_LIMITS = {
  EMAIL_MAX_ATTEMPTS: 5,
  IP_MAX_ATTEMPTS: 20,
  LOCKOUT_MINUTES: 15,
  WINDOW_MINUTES: 15,
} as const;

// Data retention periods (in days)
export const RETENTION = {
  LOGIN_ATTEMPTS: 1,
  AUDIT_LOGS: 90,
  ERROR_LOGS: 30,
} as const;

// MFA configuration
export const MFA = {
  BACKUP_CODE_COUNT: 10,
  APP_NAME: "Grant Builder",
} as const;
