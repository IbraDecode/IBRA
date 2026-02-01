import { v4 as uuidv4 } from 'uuid';

export function analyzeDevice(req) {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const deviceId = extractDeviceId(req);

  let suspicious = false;
  let reasons = [];

  if (isEmulator(userAgent)) {
    suspicious = true;
    reasons.push('emulator');
  }

  if (isRooted(userAgent)) {
    suspicious = true;
    reasons.push('rooted');
  }

  if (isSuspiciousUserAgent(userAgent)) {
    suspicious = true;
    reasons.push('suspicious_ua');
  }

  return {
    ip,
    deviceId,
    userAgent,
    suspicious,
    reasons: reasons.length > 0 ? reasons : undefined,
    timestamp: Date.now()
  };
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

function extractDeviceId(req) {
  const fingerprint = req.headers['x-device-fingerprint'] ||
                      req.headers['x-fingerprint'] ||
                      req.cookies?.device_id ||
                      uuidv4();

  const hash = hashString(fingerprint);
  return hash.substring(0, 16);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function isEmulator(ua) {
  const emulatorPatterns = [
    /android.*emulator/i,
    /bluestacks/i,
    /nox/i,
    /mumu/i,
    /ldplayer/i,
    /koplayer/i,
    /genymotion/i,
    /droid4x/i,
    /micyo/i
  ];
  return emulatorPatterns.some(pattern => pattern.test(ua));
}

function isRooted(ua) {
  const rootedPatterns = [
    /root/i,
    /supersu/i,
    /magisk/i,
    /xposed/i
  ];
  return rootedPatterns.some(pattern => pattern.test(ua));
}

function isSuspiciousUserAgent(ua) {
  if (!ua || ua.length < 10) return true;

  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /okhttp/i,
    /httpclient/i,
    /apache/i,
    /node/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(ua));
}

export function generateDeviceFingerprint() {
  const components = [
    navigator?.userAgent || '',
    navigator?.language || '',
    screen?.colorDepth || 0,
    screen?.width + 'x' + screen?.height,
    new Date().getTimezoneOffset(),
    navigator?.hardwareConcurrency || 0
  ];

  return hashString(components.join('|'));
}

export function isRateLimited(ip, limit = 100, windowMs = 60000) {
  return false;
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}
