import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  FILE_TOO_LARGE_HELP,
  HEIC_HELP,
  MAX_IMAGE_UPLOAD_BYTES,
  getImageExtension,
  hasMatchingImageSignature,
  validateImageFileMetadata,
} from "../lib/cozylogic/uploads.ts";

describe("real-user image upload policy", () => {
  it("accepts JPG, PNG, and WebP at or below the 10 MB limit", () => {
    for (const [type, extension] of [
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
    ]) {
      const result = validateImageFileMetadata({
        name: `Phone photo (final) #1.${extension}`,
        type,
        size: MAX_IMAGE_UPLOAD_BYTES,
      });
      assert.equal(result.ok, true);
      assert.equal(getImageExtension(type), extension);
    }
  });

  it("accepts portrait and landscape metadata without changing the file policy", () => {
    const portrait = validateImageFileMetadata({
      name: "portrait room.jpg",
      type: "image/jpeg",
      size: 3_200_000,
    });
    const landscape = validateImageFileMetadata({
      name: "landscape-room.jpg",
      type: "image/jpeg",
      size: 4_200_000,
    });

    assert.equal(portrait.ok, true);
    assert.equal(landscape.ok, true);
  });

  it("rejects HEIC and HEIF before upload with iPhone conversion instructions", () => {
    for (const input of [
      { name: "IMG 1234.HEIC", type: "image/heic", size: 2_000_000 },
      { name: "IMG_1234.heif", type: "", size: 2_000_000 },
    ]) {
      const result = validateImageFileMetadata(input);
      assert.deepEqual(result, {
        ok: false,
        code: "heic_not_supported",
        message: HEIC_HELP,
      });
    }
  });

  it("rejects invalid file types", () => {
    const result = validateImageFileMetadata({
      name: "room.pdf",
      type: "application/pdf",
      size: 200_000,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid_file_type");
  });

  it("rejects photos above the app limit before upload", () => {
    const result = validateImageFileMetadata({
      name: "large phone photo.jpg",
      type: "image/jpeg",
      size: MAX_IMAGE_UPLOAD_BYTES + 1,
    });

    assert.deepEqual(result, {
      ok: false,
      code: "file_too_large",
      message: FILE_TOO_LARGE_HELP,
    });
  });

  it("checks that stored bytes match the declared image type", () => {
    assert.equal(hasMatchingImageSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
    assert.equal(
      hasMatchingImageSignature(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png"
      ),
      true
    );
    assert.equal(
      hasMatchingImageSignature(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
        "image/webp"
      ),
      true
    );
    assert.equal(hasMatchingImageSignature(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), "image/jpeg"), false);
  });
});
