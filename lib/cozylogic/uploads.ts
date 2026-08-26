export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMime = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export type ImageValidationResult =
  | {
      ok: true;
      mimeType: SupportedImageMime;
      extension: "jpg" | "png" | "webp";
    }
  | {
      ok: false;
      code:
        | "missing_file"
        | "empty_file"
        | "heic_not_supported"
        | "invalid_file_type"
        | "file_too_large";
      message: string;
    };

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const HEIC_HELP =
  "HEIC/HEIF photos are not supported yet. On iPhone, choose Most Compatible in Settings > Camera > Formats, or export this photo as a JPG, then try again.";

export const FILE_TOO_LARGE_HELP =
  "This photo is larger than 10 MB. Choose a smaller copy or reduce the photo size, then try again.";

export function getImageExtension(mimeType: string) {
  if (mimeType.toLowerCase() === "image/png") return "png" as const;
  if (mimeType.toLowerCase() === "image/webp") return "webp" as const;
  return "jpg" as const;
}

export function validateImageFileMetadata(input: {
  name?: string | null;
  type?: string | null;
  size?: number | null;
}): ImageValidationResult {
  const name = (input.name ?? "").trim().toLowerCase();
  const mimeType = (input.type ?? "").trim().toLowerCase();
  const size = input.size;

  if (typeof size !== "number" || !Number.isFinite(size)) {
    return {
      ok: false,
      code: "missing_file",
      message: "Choose a room photo before starting the preview.",
    };
  }

  if (size <= 0) {
    return {
      ok: false,
      code: "empty_file",
      message: "That photo appears to be empty. Choose another JPG, PNG, or WebP image.",
    };
  }

  if (HEIC_MIME_TYPES.has(mimeType) || /\.(?:heic|heif)$/.test(name)) {
    return { ok: false, code: "heic_not_supported", message: HEIC_HELP };
  }

  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as SupportedImageMime)) {
    return {
      ok: false,
      code: "invalid_file_type",
      message: "Choose a JPG, PNG, or WebP room photo.",
    };
  }

  if (size > MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, code: "file_too_large", message: FILE_TOO_LARGE_HELP };
  }

  return {
    ok: true,
    mimeType: mimeType as SupportedImageMime,
    extension: getImageExtension(mimeType),
  };
}

export function hasMatchingImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export function isOwnedUploadPath(path: string, ownerId: string) {
  if (path !== path.trim() || path.includes("\\") || path.includes("\0")) return false;

  const segments = path.split("/");
  return (
    segments.length >= 2 &&
    segments[0] === ownerId &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}
