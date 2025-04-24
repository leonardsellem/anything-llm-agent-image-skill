# Active Context

*   **Current Focus:** Completing the OpenAI Image Generation skill by resolving the image display issues in AnythingLLM.
*   **Recent Changes:** 
    *   Implemented full `handler.js` with support for all three operations (generate, edit, variation).
    *   Created comprehensive Jest tests.
    *   Converted `handler.js` from ES Module (import/export) to CommonJS (module.exports) to meet AnythingLLM's requirements.
    *   Fixed `plugin.json` schema issues that were causing UI loading failures.
    *   Created proper CommonJS-compatible mock for OpenAI SDK in tests.
    *   Fixed token limit issue by saving images to disk instead of returning huge base64 strings.
    *   Added prefix to handler output (`Image saved at: tmp/...`) to help LLM identify the image path.
    *   Added example responses to plugin.json with expected_response fields showing models how to include image paths.
    *   Fixed babel.config.js to use CommonJS exports.
*   **Next Steps:**
    1.  **Fix Image Path Display Issue**: The agent still doesn't include the image path in its response. Possible solutions:
        * **Option A**: Return just the raw path (`tmp/filename.png`) with no prefix/text.
        * **Option B**: Return a JSON string with an image_path field that Anything LLM can explicitly parse.
        * **Option C**: Modify the system prompt in AnythingLLM to explicit tell the LLM to always include paths from skill responses.
    2.  **Fix Empty/Corrupted Image Files**: Files saved in tmp/ are very small (18-21 bytes) and corrupted. In tests this is expected (mocks return tiny strings), but we should verify real OpenAI responses create proper files.
    3.  **Fix Jest Tests**: Update test assertions to match the new file-saving approach instead of expecting base64 strings.
    4.  **Add Cleanup Routine**: Create a mechanism to periodically clean up old images to prevent disk space issues.
*   **Active Decisions:**
    *   Changed strategy from returning base64 strings to saving images as files (due to massive token usage).
    *   Added `expected_response` to examples in plugin.json to teach the LLM to include image paths.
    *   Decided to prefix image paths with "Image saved at: " to help the LLM recognize them.
    *   Using tmp/ subdirectory for saved images.
*   **Key Patterns/Preferences:**
    *   Adhere strictly to AnythingLLM custom skill structure (`hubId` folder, `plugin.json`, `handler.js`).
    *   Use the official OpenAI Node.js SDK.
    *   Prioritize clear error handling and messaging back to the agent.
    *   Employ parameter validation (potentially using a library like `zod` later if complexity increases).
*   **Learnings/Insights:**
    *   AnythingLLM skills have a strict requirement for the handler function to return a string.
    *   The `plugin.json` is crucial for defining the skill's interface to the LLM, including parameters and examples (few-shot prompting).
    *   Hot-loading simplifies the development feedback loop.
    *   OpenAI `gpt-image-1` offers advanced capabilities like editing and inpainting, but also has specific requirements (e.g., mask format).
    *   AnythingLLM requires skills to be CommonJS modules (using `module.exports`, not ES `export`).
    *   The `plugin.json` schema must include mandatory fields (`schema: "skill-1.0.0"`, `version`, `active`, `name`, and `description`), and extra fields can cause UI errors.
    *   When testing with Jest, care must be taken when mocking CommonJS modules with ES Module tests.
    *   The `this` context in handler functions can be undefined during tests, requiring defensive programming (e.g., for `this.introspect` calls).
    *   **NEW**: Base64-encoded images (1024×1024 PNG) can be ~2MB, exceeding OpenAI's token limits when included in messages.
    *   **NEW**: AnythingLLM relies on the LLM (not code logic) to include skill outputs in responses, requiring careful prompting through examples.
    *   **NEW**: Anything LLM's skill model passes the raw handler string output to the LLM, which can choose to paraphrase or exclude it unless prompted with examples.
    *   **NEW**: The Anything LLM agent times out after 300 seconds (5 minutes) on complex interactions.
