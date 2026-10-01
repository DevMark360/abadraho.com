/** Dev-only secrets in API responses (OTP, reset/verify URLs). Never enabled in production. */
function isDevSecretsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.OTP_DEV_EXPOSE === "true";
}

/** Expose OTP in API response when SMS is not configured (local dev only). */
export function shouldExposeOtpDev(): boolean {
  return isDevSecretsAllowed();
}

/** Expose password-reset URL in API response (local dev only). */
export function shouldExposeResetUrlDev(): boolean {
  return isDevSecretsAllowed();
}

/** Expose email-verification URL when SMTP is off (local dev only). */
export function shouldExposeVerifyUrlDev(): boolean {
  return isDevSecretsAllowed();
}
