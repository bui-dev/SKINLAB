import { createHash, createHmac } from "node:crypto";
import { Injectable, Optional } from "@nestjs/common";

export type S3StoreConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

export interface ObjectStore {
  putObject(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void>;
  headObject(
    key: string,
  ): Promise<{ sizeBytes: number; contentType: string } | null>;
  getPresignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  getBucketName(): string;
}

@Injectable()
export class S3ObjectStore implements ObjectStore {
  private readonly endpoint: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor(@Optional() config?: Partial<S3StoreConfig>) {
    this.endpoint = (
      config?.endpoint ??
      process.env.S3_ENDPOINT ??
      "http://localhost:9000"
    ).replace(/\/$/, "");
    this.region = config?.region ?? process.env.S3_REGION ?? "us-east-1";
    this.bucket =
      config?.bucket ?? process.env.S3_BUCKET ?? "skinlab-clinical-media";
    this.accessKey =
      config?.accessKey ??
      process.env.S3_ACCESS_KEY_ID ??
      process.env.S3_ACCESS_KEY ??
      "skinlab";
    this.secretKey =
      config?.secretKey ??
      process.env.S3_SECRET_ACCESS_KEY ??
      process.env.S3_SECRET_KEY ??
      "skinlab_minio_password";
  }

  getBucketName(): string {
    return this.bucket;
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const host = new URL(this.endpoint).host;

    const payloadHash = createHash("sha256").update(body).digest("hex");

    const headers: Record<string, string> = {
      Host: host,
      "Content-Type": contentType,
      "Content-Length": body.length.toString(),
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
    };

    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    const sortedHeaderKeys = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();
    const signedHeaders = sortedHeaderKeys.join(";");
    const canonicalHeaders = sortedHeaderKeys
      .map((k) => {
        const originalKey = Object.keys(headers).find(
          (orig) => orig.toLowerCase() === k,
        )!;
        return `${k}:${headers[originalKey].trim().replace(/\s+/g, " ")}\n`;
      })
      .join("");

    const canonicalUri = `/${this.bucket}/${key}`;
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "", // query
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signature = this.calculateSignature(dateStamp, stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    headers["Authorization"] = authorization;

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to put object to S3: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
  }

  async headObject(
    key: string,
  ): Promise<{ sizeBytes: number; contentType: string } | null> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const host = new URL(this.endpoint).host;
    const payloadHash = createHash("sha256").update("").digest("hex");

    const headers: Record<string, string> = {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
    };

    const canonicalUri = `/${this.bucket}/${key}`;
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "HEAD",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signature = this.calculateSignature(dateStamp, stringToSign);
    headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: "HEAD",
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to head object from S3: ${response.status} ${response.statusText}`,
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";

    return { sizeBytes: contentLength, contentType };
  }

  async getPresignedReadUrl(key: string, ttlSeconds: number): Promise<string> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const credential = `${this.accessKey}/${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": ttlSeconds.toString(),
      "X-Amz-SignedHeaders": "host",
    });

    queryParams.sort();

    const canonicalUri = `/${this.bucket}/${key}`;
    const host = new URL(this.endpoint).host;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const canonicalQueryString = queryParams.toString();
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      "GET",
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      `${dateStamp}/${this.region}/s3/aws4_request`,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signature = this.calculateSignature(dateStamp, stringToSign);
    queryParams.set("X-Amz-Signature", signature);

    return `${this.endpoint}${canonicalUri}?${queryParams.toString()}`;
  }

  private calculateSignature(dateStamp: string, stringToSign: string): string {
    const kDate = createHmac("sha256", `AWS4${this.secretKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = createHmac("sha256", kService)
      .update("aws4_request")
      .digest();
    return createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  }
}
