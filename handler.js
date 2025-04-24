// AnythingLLM Custom Agent Skill
// OpenAI Image Generation (generate, edit, variation)
//
// NOTE: AnythingLLM loads skills with Node **CommonJS require()**,
// so this file **MUST** use CommonJS exports (module.exports) and
// **MUST** use require() to load dependencies – no ES `import` / `export`.

// These requires are safe in CommonJS - they're built into Node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
 * Saves an image from base64 data to the tmp directory and returns the URL
 */
function saveImageAndGetUrl(b64Data, operation) {
  // Generate unique filename with timestamp and random suffix
  const uniqueId = crypto.randomBytes(4).toString('hex');
  const timestamp = Date.now();
  const fileName = `${operation}_${timestamp}_${uniqueId}.png`;
  const filePath = path.join(__dirname, 'tmp', fileName);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.mkdirSync(path.join(__dirname, 'tmp'), { recursive: true });
  }
  
  // Write the image file
  fs.writeFileSync(filePath, Buffer.from(b64Data, 'base64'));
  
  // Return path with prefix to help the LLM know it should include this in its response
  const relativePath = `tmp/${fileName}`;
  return `Image saved at: ${relativePath}`;
}

async function generateImage (openai, { prompt, size, quality, n }) {
  const rsp = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size,
    quality,
    n,
    response_format: "b64_json"
  });
  
  // Save the first image and return its URL
  return saveImageAndGetUrl(rsp.data[0].b64_json, 'generate');
}

async function editImage (openai, { prompt, imageBuf, maskBuf, size, n }) {
  const rsp = await openai.images.edit({
    model: "dall-e-2",
    prompt,
    image: imageBuf,
    mask: maskBuf,
    size,
    n,
    response_format: "b64_json"
  });
  
  return saveImageAndGetUrl(rsp.data[0].b64_json, 'edit');
}

async function variationImage (openai, { imageBuf, size, n }) {
  const rsp = await openai.images.createVariation({
    model: "dall-e-2",
    image: imageBuf,
    size,
    n,
    response_format: "b64_json"
  });
  
  return saveImageAndGetUrl(rsp.data[0].b64_json, 'variation');
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
    mask
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
        : console.log;

      _introspect(`OpenAI Image Generation invoked (${operation})`);

    /* ------------------ input validation ------------------ */
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
      const openai = getOpenAIClient(this?.runtimeArgs?.OPENAI_API_KEY);

      switch (operation) {
        case "generate":
          return await retryOperation(() =>
            generateImage(openai, { prompt, size, quality, n })
          );

        case "edit":
          return await retryOperation(() =>
            editImage(openai, { prompt, imageBuf, maskBuf, size, n })
          );

        case "variation":
          return await retryOperation(() =>
            variationImage(openai, { imageBuf, size, n })
          );

        default:
          return "Error: unreachable operation.";
      }
    } catch (e) {
      const errorDetails = e.response?.data?.error?.message || e.message || String(e);
      _log(`OpenAI image op failed: ${errorDetails}`);
      
      // Return a generic error message with details
      let errorPrefix;
      switch (operation) {
        case "generate": errorPrefix = "Failed to generate image"; break;
        case "edit": errorPrefix = "Failed to edit image"; break;
        case "variation": errorPrefix = "Failed to create image variation"; break;
        default: errorPrefix = "Failed to process image"; break;
      }
      
      return `Error: ${errorPrefix}. ${errorDetails}\n\nNote: Large images are saved to disk to prevent token overflow errors.`;
    }
  }
};
