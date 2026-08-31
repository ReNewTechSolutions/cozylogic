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

export async function getSignedUrls(
  supabase: any,
  bucket: CozyBucket,
  paths: string[],
  expiresIn = 60 * 60
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, expiresIn);

  if (error) throw error;

  const signedUrls = (data ?? []) as Array<{
    path?: string;
    signedUrl?: string;
    error?: string | null;
  }>;

  return signedUrls.reduce<Record<string, string>>((urls, item) => {
    if (item.path && item.signedUrl && !item.error) {
      urls[item.path] = item.signedUrl;
    }
    return urls;
  }, {});
}
