// lib/cozylogic/images.ts
import {
    STORAGE_BUCKET_INPUTS,
    STORAGE_BUCKET_OUTPUTS,
  } from "@/lib/cozylogic/constants";
  
  export type CozyBucket = typeof STORAGE_BUCKET_INPUTS | typeof STORAGE_BUCKET_OUTPUTS;
  
  export async function getSignedUrl(bucket: CozyBucket, path: string) {
    const res = await fetch("/api/images/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path }),
    });
  
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error ?? "Failed to create signed URL");
    }
  
    return json.signedUrl as string;
  }