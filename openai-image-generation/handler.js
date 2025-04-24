import OpenAI from "openai";

// Initialize OpenAI client using the API key from setup_args or environment variables
// AnythingLLM runtime should make setup_args available via process.env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Handles image generation, editing, and variation requests.
 * @param {object} params - Parameters passed from the AnythingLLM agent based on plugin.json.
 * @param {string} params.prompt - Text prompt for the image.
 * @param {string} [params.operation="generate"] - The operation: "generate", "edit", or "variation".
 * @param {string} [params.size="512x512"] - Image size ("256x256", "512x512", "1024x1024").
 * @param {string} [params.quality="standard"] - Image quality ("standard", "hd").
 * @param {number} [params.n=1] - Number of images to generate (1-4).
 * @param {string} [params.image] - Base64 PNG image for edits/variations.
 * @param {string} [params.mask] - Base64 PNG mask for edits.
 * @returns {Promise<string>} - A base64 encoded image string or an error message string.
 */
export async function handler({
  prompt,
  operation = "generate",
  size = "512x512",
  quality = "standard",
  n = 1,
  image, // Base64 string
  mask   // Base64 string
}) {
  console.log(`Handling image operation: ${operation} with prompt: "${prompt}"`); // Basic logging

  try {
    // Basic input validation
    if (!prompt && (operation === 'generate' || operation === 'edit')) {
      return "Error: Prompt is required for generate and edit operations.";
    }
    if (!image && (operation === 'edit' || operation === 'variation')) {
      return `Error: Base64 image string is required for ${operation} operation.`;
    }
    if (operation === 'edit' && !mask) {
      return "Error: Base64 mask string is required for edit operation.";
    }

    // Convert base64 strings to Buffers if needed by the SDK (check SDK docs)
    // For OpenAI Node SDK v4+, it expects Buffers or ReadStreams for image/mask uploads.
    // However, for API calls like images.edit/createVariation where image/mask are passed
    // directly in the request body (not as form data), base64 strings might be acceptable.
    // Let's assume base64 strings work directly for now, but keep Buffers in mind.
    // const imageBuffer = image ? Buffer.from(image, 'base64') : undefined;
    // const maskBuffer = mask ? Buffer.from(mask, 'base64') : undefined;

    switch (operation) {
      case "generate":
        return await generateImage({ prompt, size, quality, n });
      case "edit":
        // Pass base64 strings directly for now
        return await editImage({ prompt, image, mask, size, n });
      case "variation":
         // Pass base64 strings directly for now
        return await varyImage({ image, n, size });
      default:
        console.error(`Invalid operation received: ${operation}`);
        return `Error: Invalid operation specified: ${operation}. Must be 'generate', 'edit', or 'variation'.`;
    }
  } catch (err) {
    console.error(`Error during OpenAI API call for operation ${operation}:`, err);
    // Try to extract a meaningful error message
    const errorMessage = err.response?.data?.error?.message || err.message || String(err);
    return `Error: Failed to ${operation} image. ${errorMessage}`;
  }
}

async function generateImage({ prompt, size, quality, n }) {
  console.log(`Generating image with size: ${size}, quality: ${quality}, n: ${n}`);
  const response = await openai.images.generate({
    model: "dall-e-3", // Or "dall-e-2" if preferred/needed
    prompt,
    size,
    quality,
    n,
    response_format: "b64_json" // Request base64 encoded image data
  });
  console.log(`Image generation successful. Returning base64 data.`);
  // Assuming n=1 for simplicity in this basic handler, return the first image
  return response.data[0].b64_json;
}

async function editImage({ prompt, image, mask, size, n }) {
  console.log(`Editing image with size: ${size}, n: ${n}`);
  // Note: DALL-E 2 is typically used for edits/variations via API
  // Ensure the base64 strings are correctly formatted if not using Buffers
  const response = await openai.images.edit({
    // model: "dall-e-2", // Explicitly specify if needed
    prompt,
    image: image, // Pass base64 string
    mask: mask,   // Pass base64 string
    size,
    n,
    response_format: "b64_json"
  });
  console.log(`Image edit successful. Returning base64 data.`);
  return response.data[0].b64_json;
}

async function varyImage({ image, n, size }) {
  console.log(`Creating image variation with size: ${size}, n: ${n}`);
  // Note: DALL-E 2 is typically used for edits/variations via API
  const response = await openai.images.createVariation({
    // model: "dall-e-2", // Explicitly specify if needed
    image: image, // Pass base64 string
    n,
    size,
    response_format: "b64_json"
  });
  console.log(`Image variation successful. Returning base64 data.`);
  return response.data[0].b64_json;
}
