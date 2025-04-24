import OpenAI from "openai";
import { Buffer } from 'buffer'; // Import Buffer

// Singleton pattern for OpenAI client initialization
let openaiClient = null;
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API Key (OPENAI_API_KEY) is not set.");
      // Return a dummy object or throw an error, depending on desired handling
      // For now, let the OpenAI constructor handle the missing key error later
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Simple retry mechanism for transient errors
async function retryOperation(operationFn, maxRetries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operationFn();
    } catch (err) {
      // Only retry on 5xx errors or network issues (customize as needed)
      const isRetryable = err.status >= 500 || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET';
      if (isRetryable && attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs * Math.pow(2, attempt - 1)}ms... Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      } else {
        console.error(`Attempt ${attempt} failed. No more retries or error not retryable. Error: ${err.message}`);
        throw err; // Re-throw the error if not retryable or max retries reached
      }
    }
  }
}


/**
 * Handles image generation, editing, and variation requests.
 * @param {object} params - Parameters passed from the AnythingLLM agent based on plugin.json.
 * @param {string} params.prompt - Text prompt for the image.
 * @param {string} [params.operation="generate"] - The operation: "generate", "edit", or "variation".
 * @param {string} [params.size="1024x1024"] - Image size ("256x256", "512x512", "1024x1024", "1792x1024", "1024x1792" - check DALL-E 3 support). Defaulting to 1024x1024.
 * @param {string} [params.quality="standard"] - Image quality ("standard", "hd"). Only for DALL-E 3.
 * @param {number} [params.n=1] - Number of images to generate (1-4, check model limits).
 * @param {string} [params.image] - Base64 PNG image for edits/variations. Must be valid PNG.
 * @param {string} [params.mask] - Base64 PNG mask for edits. Must be valid PNG, same size as image, with transparency.
 * @returns {Promise<string>} - A base64 encoded image string or an error message string.
 */
export async function handler({
  prompt,
  operation = "generate",
  size = "1024x1024", // Default to a common DALL-E 3 size
  quality = "standard",
  n = 1,
  image, // Base64 string
  mask   // Base64 string
}) {
  console.log(`Handling image operation: ${operation} with prompt: "${prompt ? prompt.substring(0, 50) + '...' : 'N/A'}"`);

  // --- Enhanced Input Validation ---
  const validOperations = ["generate", "edit", "variation"];
  if (!validOperations.includes(operation)) {
    return `Error: Invalid operation specified: ${operation}. Must be one of ${validOperations.join(', ')}.`;
  }

  // DALL-E 3 sizes (check latest docs)
  const validSizesGen = ["1024x1024", "1792x1024", "1024x1792"];
  // DALL-E 2 sizes
  const validSizesEditVar = ["256x256", "512x512", "1024x1024"];
  const validSizes = operation === 'generate' ? validSizesGen : validSizesEditVar;
  if (!validSizes.includes(size)) {
    return `Error: Invalid size "${size}" for operation "${operation}". Valid sizes are: ${validSizes.join(', ')}.`;
  }

  const validQualities = ["standard", "hd"];
  if (operation === 'generate' && !validQualities.includes(quality)) {
    return `Error: Invalid quality "${quality}". Must be one of ${validQualities.join(', ')}.`;
  }

  if (typeof n !== 'number' || n < 1 || n > 4) { // Check OpenAI limits for 'n' per model
    return `Error: Invalid number of images 'n' (${n}). Must be an integer between 1 and 4.`;
  }

  // Basic Base64 check (can be improved)
  const isBase64 = (str) => {
    if (!str || typeof str !== 'string') return false;
    // Basic check for valid characters and padding
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str);
  };

  if (!prompt && (operation === 'generate' || operation === 'edit')) {
    return "Error: Prompt is required for 'generate' and 'edit' operations.";
  }
  if (!image && (operation === 'edit' || operation === 'variation')) {
    return `Error: Base64 image string is required for '${operation}' operation.`;
  }
  if (image && !isBase64(image)) {
     return `Error: Provided image for '${operation}' is not a valid base64 string.`;
  }
  if (operation === 'edit' && !mask) {
    return "Error: Base64 mask string is required for 'edit' operation.";
  }
   if (mask && !isBase64(mask)) {
     return `Error: Provided mask for 'edit' is not a valid base64 string.`;
  }
  // --- End Validation ---


  try {
    const openai = getOpenAIClient(); // Get the singleton client instance
    if (!process.env.OPENAI_API_KEY) {
       return "Error: OpenAI API Key (OPENAI_API_KEY) is not configured in environment variables or setup arguments.";
    }

    // Convert base64 to Buffer for API calls that require file uploads (like edit/variation)
    // The OpenAI SDK v4 expects file-like objects (Buffer, ReadStream) for image/mask params.
    const imageBuffer = image ? Buffer.from(image, 'base64') : undefined;
    const maskBuffer = mask ? Buffer.from(mask, 'base64') : undefined;

    switch (operation) {
      case "generate":
        return await retryOperation(() => generateImage(openai, { prompt, size, quality, n }));
      case "edit":
        return await retryOperation(() => editImage(openai, { prompt, image: imageBuffer, mask: maskBuffer, size, n }));
      case "variation":
        return await retryOperation(() => varyImage(openai, { image: imageBuffer, n, size }));
      default:
         // This case should technically be unreachable due to validation above
        console.error(`Invalid operation reached execution: ${operation}`);
        return `Error: Invalid operation specified: ${operation}.`;
    }
  } catch (err) {
    console.error(`Error during OpenAI API call for operation ${operation}:`, err);
    // Improved error message extraction
    let errorMessage = "An unknown error occurred.";
    if (err.response) { // Axios-like error structure from OpenAI SDK
      errorMessage = `API Error ${err.status || ''}: ${JSON.stringify(err.response.data?.error || err.response.data || err.message)}`;
    } else if (err.message) {
      errorMessage = err.message;
    } else {
       errorMessage = String(err);
    }
    return `Error: Failed to ${operation} image. ${errorMessage}`;
  }
}

// Pass openai client instance to helper functions
async function generateImage(openai, { prompt, size, quality, n }) {
  console.log(`Generating image with size: ${size}, quality: ${quality}, n: ${n}`);
  const response = await openai.images.generate({
    model: "dall-e-3", // Use DALL-E 3 for generation
    prompt,
    size, // e.g., "1024x1024"
    quality, // "standard" or "hd"
    n,
    response_format: "b64_json" // Request base64 encoded image data
  });
  console.log(`Image generation successful. Returning base64 data for the first image.`);
  // Return the first image if multiple are generated (n > 1)
  return response.data[0].b64_json;
}

// Pass openai client instance
async function editImage(openai, { prompt, image, mask, size, n }) {
  console.log(`Editing image with size: ${size}, n: ${n}`);
  // Edits require DALL-E 2 model via API
  const response = await openai.images.edit({
    model: "dall-e-2", // Explicitly use DALL-E 2
    prompt,
    image: image, // Pass Buffer
    mask: mask,   // Pass Buffer
    size, // e.g., "1024x1024"
    n,
    response_format: "b64_json"
  });
  console.log(`Image edit successful. Returning base64 data for the first image.`);
  return response.data[0].b64_json;
}

// Pass openai client instance
async function varyImage(openai, { image, n, size }) {
  console.log(`Creating image variation with size: ${size}, n: ${n}`);
  // Variations require DALL-E 2 model via API
  const response = await openai.images.createVariation({
    model: "dall-e-2", // Explicitly use DALL-E 2
    image: image, // Pass Buffer
    n,
    size, // e.g., "1024x1024"
    response_format: "b64_json"
  });
  console.log(`Image variation successful. Returning base64 data for the first image.`);
  return response.data[0].b64_json;
}
