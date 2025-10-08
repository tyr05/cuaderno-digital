import crypto from "crypto";

export const MIN_PASSWORD_LENGTH = 8;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function generateStrongPassword(length = 12) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = letters + digits + symbols;

  const required = [
    letters[crypto.randomInt(0, letters.length)],
    letters[crypto.randomInt(0, letters.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  while (required.length < length) {
    required.push(all[crypto.randomInt(0, all.length)]);
  }

  return shuffle(required).join("").slice(0, length);
}

export function isPasswordStrong(password) {
  const value = typeof password === "string" ? password.trim() : "";
  return (
    value.length >= MIN_PASSWORD_LENGTH &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value)
  );
}

export function enforcePasswordPolicy(candidate, options = {}) {
  const maxLength = options.maxLength || 64;
  const base = typeof candidate === "string" ? candidate.trim() : "";
  if (isPasswordStrong(base)) {
    return base.slice(0, maxLength);
  }

  if (!base) {
    return generateStrongPassword(Math.min(16, maxLength));
  }

  const sanitized = base.replace(/\s+/g, "");
  const mixed = `${sanitized}${generateStrongPassword(Math.min(12, maxLength))}`
    .replace(/[^A-Za-z0-9!@#$%^&*]/g, "")
    .slice(0, maxLength);

  if (isPasswordStrong(mixed)) {
    return mixed;
  }

  return generateStrongPassword(Math.min(16, maxLength));
}
