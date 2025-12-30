import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_MEDIA_BUCKET = process.env.R2_MEDIA_BUCKET_NAME || "opencut-media";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
  console.warn("R2 credentials not configured. Media uploads will fail.");
}

if (!R2_PUBLIC_URL) {
  console.warn("R2_PUBLIC_URL not configured. Media URLs may not work correctly.");
}

// Create S3 client for R2
// Note: Cloudflare R2 uses a specific endpoint format
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: false, // Use virtual-hosted-style requests
  tls: true,
});

/**
 * Upload a file to Cloudflare R2
 * @param file - File buffer or Uint8Array
 * @param key - Object key (path) in R2 bucket
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_MEDIA_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Return public URL for the bucket using the configured Public Development URL
    // This URL is set in the Cloudflare R2 dashboard under "Public access"
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return publicUrl;
  } catch (error) {
    console.error("R2 upload error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload file to R2: ${errorMessage}`);
  }
}

/**
 * Generate a safe file key for R2 storage
 * @param projectId - Project ID
 * @param mediaId - Media file ID
 * @param filename - Original filename
 * @returns Safe object key
 */
export function generateMediaKey(
  projectId: string,
  mediaId: string,
  filename: string
): string {
  // Sanitize filename - remove special characters
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  // Structure: projects/{projectId}/media/{mediaId}-{filename}
  return `projects/${projectId}/media/${mediaId}-${sanitized}`;
}

/**
 * Get the content type from a file extension
 */
export function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",

    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}
