// lib/cozylogic/images.ts
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
} from "@/lib/cozylogic/constants";

export type CozyBucket = typeof STORAGE_BUCKET_INPUTS | typeof STORAGE_BUCKET_OUTPUTS;

export async function getSignedUrl(
  supabase: any,
  bucket: CozyBucket,
  path: string,
  expiresIn = 60 * 60
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data?.signedUrl as string;
}