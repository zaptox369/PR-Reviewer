import crypto from 'crypto';

/**
 * Validates GitHub webhook HMAC-SHA256 signature using timing-safe equality check.
 * Prevents timing attacks and payload tampering.
 */
export function verifyGitHubSignature(
  payloadBuffer: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // GitHub sends signatures with prefix 'sha256='
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const signature = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadBuffer);
  const expectedSignature = hmac.digest('hex');

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Helper to generate a valid GitHub webhook signature for testing/simulations.
 */
export function generateGitHubSignature(payload: string | Buffer, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}
