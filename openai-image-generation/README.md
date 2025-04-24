# OpenAI Image Generation Skill for AnythingLLM

This skill allows AnythingLLM agents to generate, edit, and create variations of images using the OpenAI API (specifically targeting `dall-e-3` for generation and `dall-e-2` for edits/variations as per API capabilities).

## Features

*   **Generate Images:** Create images from text prompts.
*   **Edit Images:** Modify existing images based on a text prompt and a mask.
*   **Create Variations:** Generate variations of an existing image.

## Setup

1.  **Place the Skill:** Copy or mount this entire `openai-image-generation` folder into your AnythingLLM instance's `STORAGE_DIR/plugins/agent-skills/` directory.
2.  **API Key:** Ensure you have a valid OpenAI API key. When enabling the skill in the AnythingLLM UI, you will be prompted to enter this key in the "Setup Arguments" section for the `OPENAI_API_KEY` field. Alternatively, ensure the `OPENAI_API_KEY` environment variable is set in the environment where AnythingLLM is running.
3.  **Enable Skill:** Navigate to your Agent's settings in the AnythingLLM UI, go to the "Skills" section, find "OpenAI Image Generation", and enable it. Provide the API key if prompted.

## Usage

Once enabled, you can instruct your agent to use the skill. The agent will use the information in `plugin.json` to understand how to call the skill.

**Example Prompts:**

*   "Generate an image of a serene mountain lake at sunrise, impressionist style."
*   "Take this image [provide image context if possible] and make the sky purple." (Requires providing the base64 image and mask via parameters)
*   "Create a variation of this picture [provide image context]." (Requires providing the base64 image via parameters)

The skill expects parameters as defined in `plugin.json`, including the `prompt`, `operation` (generate, edit, variation), and optional parameters like `size`, `quality`, `n`, `image` (base64), and `mask` (base64).

## Parameters

*   `prompt` (string, required for generate/edit): The text description for the image.
*   `operation` (string, optional, default: "generate"): The action to perform (`generate`, `edit`, `variation`).
*   `size` (string, optional, default: "512x512"): Image dimensions (`256x256`, `512x512`, `1024x1024`). Note: Check OpenAI documentation for model-specific size support.
*   `quality` (string, optional, default: "standard"): Image quality (`standard`, `hd`). Only applicable for `dall-e-3` generation.
*   `n` (integer, optional, default: 1): Number of images (1-4). Note: The handler currently returns only the first image.
*   `image` (string, required for edit/variation): Base64 encoded PNG source image.
*   `mask` (string, required for edit): Base64 encoded PNG mask image with transparency indicating edit areas. Must be the same size as `image`.

## Return Value

The skill returns a single base64 encoded string of the generated/edited/varied PNG image, or an error message string if something goes wrong.

## Troubleshooting

*   **API Key Errors:** Double-check that the `OPENAI_API_KEY` is correctly entered during setup or available as an environment variable. Ensure the key has access to the necessary OpenAI models.
*   **Invalid Parameters:** Ensure prompts, image data, and masks are provided correctly according to the `operation` being performed. Check base64 encoding.
*   **Mask Issues:** For edits, ensure the mask is a PNG with transparency and matches the dimensions of the source image.
*   **API Errors:** Check the returned error message for details from the OpenAI API (e.g., rate limits, content policy violations).
