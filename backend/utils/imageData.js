"use strict";

// Logos are stored as small raster data URLs. SVG is refused (it can carry scripts).
const RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_BYTES = 400 * 1024;

/** Returns null for empty, the string when valid, throws a 400 otherwise. */
const checkImageDataUrl = (value, label = "Image") => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !RE.test(value)) {
    throw Object.assign(new Error(`${label} must be a PNG, JPEG or WebP image`), { statusCode: 400 });
  }
  const bytes = Math.floor(((value.length - value.indexOf(",") - 1) * 3) / 4);
  if (bytes > MAX_BYTES) {
    throw Object.assign(new Error(`${label} is too large (max ${MAX_BYTES / 1024} KB)`), { statusCode: 400 });
  }
  return value;
};

module.exports = { checkImageDataUrl, MAX_BYTES };
