// AnythingLLM Custom Agent Skill
// OpenAI Image Generation (generate, edit, variation)
//
// NOTE: AnythingLLM loads skills with Node **CommonJS require()**,
// so this file **MUST** use CommonJS exports (module.exports) and
// **MUST** use require() to load dependencies – no ES `import` / `export`.

// These requires are safe in CommonJS - they're built into Node
const fs = require('fs'); // Keep for potential future use or local testing fallback
const path = require('path');
const crypto = require('crypto');

// Lazy require AWS SDK v3 components
let _s3Client = null;
let S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl;

/* ------------------------------------------------------------------ */
/*  Singleton OpenAI client loader (lazy-require)                      */
/* ------------------------------------------------------------------ */
let _openaiClient = null;
function getOpenAIClient (apiKeyFromRuntime) {
  if (_openaiClient) return _openaiClient;

  const apiKey = apiKeyFromRuntime || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Returning an explicit error string is the recommended pattern
    // so the agent can surface it to the user.
    throw new Error(
      "OpenAI API Key (OPENAI_API_KEY) is not configured"
    );
  }

  // Lazy require inside function scope (per handler.js guidelines)
  const OpenAI = require("openai");
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

/* ------------------------------------------------------------------ */
/*  Singleton S3 client loader (lazy-require)                          */
/* ------------------------------------------------------------------ */
function getS3Client(runtimeArgs) {
  if (_s3Client) return _s3Client;

  // Load AWS SDK components if not already loaded
  if (!S3Client) {
    ({ S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3"));
    ({ getSignedUrl } = require("@aws-sdk/s3-request-presigner"));
  }

  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN, // Optional
    AWS_REGION,
    S3_BUCKET // We need bucket name here for validation, though client doesn't strictly need it
  } = runtimeArgs || {};

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
    throw new Error(
      "Missing required AWS S3 configuration in skill settings: Access Key ID, Secret Key, Region, and Bucket Name are required."
    );
  }

  const credentials = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };
  if (AWS_SESSION_TOKEN) {
    credentials.sessionToken = AWS_SESSION_TOKEN;
  }

  _s3Client = new S3Client({
    region: AWS_REGION,
    credentials,
  });

  return _s3Client;
}


/* ------------------------------------------------------------------ */
/*  Helper: simple retry for transient errors (≥5xx / network codes)   */
/* ------------------------------------------------------------------ */
async function retryOperation (fn, max = 3, baseDelay = 500) {
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable =
        (err.status && err.status >= 500) ||
        ["ETIMEDOUT", "ECONNRESET"].includes(err.code);
      if (retryable && attempt < max) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(
          `[retry] attempt ${attempt} failed – retrying in ${delay}ms: ${err.message}`
        );
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(
          `[retry] attempt ${attempt} failed – giving up: ${err.message}`
        );
        throw err;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Core helper functions using OpenAI SDK                             */
/* ------------------------------------------------------------------ */
/**
 * Uploads image buffer to S3 and returns a pre-signed URL in Markdown format.
 */
async function uploadImageAndGetSignedUrl(
  s3Client,
  { bucket, region, ttlSeconds, imageBuffer, operation }
) {
  // Generate unique S3 key
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const key = `images/${operation}_${timestamp}_${uniqueId}.png`;

  // 1. Upload to S3
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png', // Assuming PNG format from OpenAI
  });
  await s3Client.send(putCommand);
  console.log(`Successfully uploaded ${key} to s3://${bucket}`);

  // 2. Generate pre-signed URL
  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: ttlSeconds, // TTL in seconds
  });
  console.log(`Generated pre-signed URL (expires in ${ttlSeconds}s): ${signedUrl}`);

  // 3. Return Markdown formatted URL
  // Use a generic alt text as the specific prompt might be too long/complex
  const altText = `${operation} image`;
  return `![${altText}](${signedUrl})`;
}


async function generateImage (openai, s3Client, s3Config, { prompt, size, quality, n }) {
  const rsp = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size,
    quality,
    n,
    response_format: "b64_json", // Request base64 data
  });

  const imageBuffer = Buffer.from(rsp.data[0].b64_json, 'base64');
  return uploadImageAndGetSignedUrl(s3Client, {
    ...s3Config,
    imageBuffer,
    operation: 'generate',
  });
}

async function editImage (openai, s3Client, s3Config, { prompt, imageBuf, maskBuf, size, n }) {
  const rsp = await openai.images.edit({
    model: "dall-e-2",
    prompt,
    image: imageBuf,
    mask: maskBuf,
    size,
    n,
    response_format: "b64_json",
  });

  const imageBuffer = Buffer.from(rsp.data[0].b64_json, 'base64');
  return uploadImageAndGetSignedUrl(s3Client, {
    ...s3Config,
    imageBuffer,
    operation: 'edit',
  });
}

async function variationImage (openai, s3Client, s3Config, { imageBuf, size, n }) {
  const rsp = await openai.images.createVariation({
    model: "dall-e-2",
    image: imageBuf,
    size,
    n,
    response_format: "b64_json",
  });

  const imageBuffer = Buffer.from(rsp.data[0].b64_json, 'base64');
  return uploadImageAndGetSignedUrl(s3Client, {
    ...s3Config,
    imageBuffer,
    operation: 'variation',
  });
}

/* ------------------------------------------------------------------ */
/*  Validation utilities                                               */
/* ------------------------------------------------------------------ */
const BASE64_RX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function isBase64 (str) {
  return typeof str === "string" && BASE64_RX.test(str);
}

/* ------------------------------------------------------------------ */
/*  Exported runtime object                                            */
/* ------------------------------------------------------------------ */
module.exports.runtime = {
  /**
   * Main entry for AnythingLLM.
   * Must accept a single object arg with keys defined in plugin.json
   * Must return a **string** (image base64 or error).
   */
  handler: async function ({
    prompt,
    operation = "generate",
    size = "1024x1024",
    quality = "standard",
    n = 1,
    image,
    mask,
  }) {
    /* ---------------------------------------------------------- */
    /*  Safe helpers when this.introspect / this.logger missing   */
    /* ---------------------------------------------------------- */
    const _introspect =
      typeof this === "object" && typeof this.introspect === "function"
        ? this.introspect.bind(this)
        : () => {};
    const _log =
      typeof this === "object" && typeof this.logger === "function"
        ? this.logger.bind(this)
        : console.log; // Fallback to console.log

    _introspect(`OpenAI Image Generation invoked (${operation})`);

    /* ------------------ AWS Settings Validation ------------- */
    const {
      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, // Optional
      AWS_REGION, S3_BUCKET,
      SIGNED_URL_TTL = 86400 // Default TTL = 1 day (in seconds)
    } = this?.runtimeArgs || {};

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
      return "Error: Missing required AWS S3 configuration in skill settings. Please configure Access Key ID, Secret Key, Region, and Bucket Name.";
    }
    if (typeof SIGNED_URL_TTL !== 'number' || SIGNED_URL_TTL <= 0) {
       return "Error: Invalid 'URL Expiry Seconds' setting. Must be a positive number.";
    }
    const s3Config = {
      bucket: S3_BUCKET,
      region: AWS_REGION,
      ttlSeconds: SIGNED_URL_TTL,
    };
    _introspect(`Using S3 config: bucket=${s3Config.bucket}, region=${s3Config.region}, ttl=${s3Config.ttlSeconds}s`);


    /* ------------------ OpenAI Input Validation ------------- */
    const validOps = ["generate", "edit", "variation"];
    if (!validOps.includes(operation)) {
      return `Error: Invalid operation specified: ${operation}.`;
    }

    const genSizes = ["1024x1024", "1792x1024", "1024x1792"];
    const editVarSizes = ["256x256", "512x512", "1024x1024"];
    const sizeSet = operation === "generate" ? genSizes : editVarSizes;
    if (!sizeSet.includes(size)) {
      return `Error: Invalid size "${size}" for operation "${operation}".`;
    }

    if (operation === "generate" && !["standard", "hd"].includes(quality)) {
      return `Error: Invalid quality "${quality}".`;
    }

    if (typeof n !== "number" || n < 1 || n > 4) {
      return `Error: Invalid number of images 'n' (${n}).`;
    }

    if (["generate", "edit"].includes(operation) && !prompt) {
      return "Error: Prompt is required for 'generate' and 'edit' operations.";
    }

    if (["edit", "variation"].includes(operation)) {
      if (!image) return `Error: Base64 image string is required for '${operation}' operation.`;
      if (!isBase64(image)) return `Error: Provided image for '${operation}' is not a valid base64 string.`;
    }

    if (operation === "edit") {
      if (!mask) return "Error: Base64 mask string is required for 'edit' operation.";
      if (!isBase64(mask)) return "Error: Provided mask for 'edit' is not a valid base64 string.";
    }
    /* --------------- end validation ----------------------- */

    // Convert images to Buffers if present
    const imageBuf = image ? Buffer.from(image, "base64") : undefined;
    const maskBuf = mask ? Buffer.from(mask, "base64") : undefined;

    try {
      // Initialize clients (OpenAI client uses API key from setup_args)
      const openai = getOpenAIClient(this?.runtimeArgs?.OPENAI_API_KEY);
      const s3Client = getS3Client(this?.runtimeArgs); // Uses settings

      switch (operation) {
        case "generate":
          return await retryOperation(() =>
            generateImage(openai, s3Client, s3Config, { prompt, size, quality, n })
          );

        case "edit":
          return await retryOperation(() =>
            editImage(openai, s3Client, s3Config, { prompt, imageBuf, maskBuf, size, n })
          );

        case "variation":
          return await retryOperation(() =>
            variationImage(openai, s3Client, s3Config, { imageBuf, size, n })
          );

        default:
          // Should be caught by validation, but good practice to have default
          return "Error: Invalid operation specified.";
      }
    } catch (e) {
      // Log the full error internally for debugging
      const errorDetails = e.response?.data?.error?.message || e.message || String(e);
      _log(`Skill execution failed: ${errorDetails}`);
      _log(e.stack); // Log stack trace if available

      // Return a user-friendly error message
      // Avoid exposing raw internal details like stack traces to the user
      let userErrorMessage = "An error occurred while processing the image request.";
      if (errorDetails.includes("configuration in skill settings")) {
        userErrorMessage = errorDetails; // Pass validation errors through
      } else if (errorDetails.includes("credentials")) {
         userErrorMessage = "Error: Invalid AWS credentials provided in skill settings.";
      } else if (e.code === 'NoSuchBucket' || errorDetails.includes('NoSuchBucket')) {
         userErrorMessage = `Error: The specified S3 bucket "${s3Config.bucket}" does not exist or cannot be accessed.`;
      } else if (e.code === 'AccessDenied' || errorDetails.includes('AccessDenied')) {
         userErrorMessage = `Error: Access denied when trying to access S3 bucket "${s3Config.bucket}". Check IAM permissions.`;
      }
      // Add more specific S3 error checks if needed

      return `Error: ${userErrorMessage}`;
    }
  }
};
