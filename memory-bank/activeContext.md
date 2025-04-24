# Active Context

*   **Current Focus:** Completing the OpenAI Image Generation skill by resolving remaining test issues and integrating it with AnythingLLM.
*   **Recent Changes:** 
    *   Implemented full `handler.js` with support for all three operations (generate, edit, variation).
    *   Created comprehensive Jest tests.
    *   Converted `handler.js` from ES Module (import/export) to CommonJS (module.exports) to meet AnythingLLM's requirements.
    *   Fixed `plugin.json` schema issues that were causing UI loading failures.
    *   Created proper CommonJS-compatible mock for OpenAI SDK in tests.
*   **Next Steps:**
    1.  Fix failing tests by updating the assertion strings to match the new error messages from handler.js.
    2.  Test the skill in a live AnythingLLM instance to verify full integration.
    3.  Document any remaining issues or edge cases in the README.
*   **Active Decisions:**
    *   Confirmed the plan to update all memory bank files before starting code implementation.
    *   Decided to use `gpt-image-1` as the primary model.
    *   Will return images as base64 strings from the handler.
    *   The skill will support Generations and Edits (including inpainting via mask). Variations endpoint (DALL-E 2 only) might be lower priority or omitted if complex to integrate cleanly.
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
