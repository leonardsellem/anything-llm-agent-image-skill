# Project Brief

*   **Project Name:** Anything-LLM Agent Image Generation Skill
*   **Core Goal:** Enable agents to generate, edit, and vary images using the OpenAI `gpt-image-1` model through the Image API.
*   **Key Requirements:**
    *   Support OpenAI Image API endpoints: Generations, Edits, Variations (DALL-E 2 only for variations).
    *   Accept a text prompt and optional parameters: `size`, `quality`, `background`, `n`, `moderation`, `mask` (for edits).
    *   Return the generated image as a base64-encoded string, as required by the Anything-LLM skill handler.
    *   Implement basic input validation for parameters.
    *   Surface meaningful error messages from the API or validation failures.
    *   Structure the skill within a folder named after its `hubId`, containing `plugin.json` and `handler.js`.
    *   Include example prompts and calls in `plugin.json` to guide the LLM.
    *   Support hot-loading by adhering to the Anything-LLM plugin structure.
*   **Scope:**
    *   **In-scope:**
        *   A single Anything-LLM agent skill written in JavaScript (NodeJS 18+).
        *   Integration with the OpenAI Node.js SDK to call the Image API (`gpt-image-1` model primarily).
        *   Creation of `plugin.json` defining the skill's interface and parameters.
        *   Implementation of `handler.js` containing the core logic.
        *   Basic unit tests for the handler logic.
        *   A `README.md` explaining setup and usage.
    *   **Out-of-scope:**
        *   Changes to the Anything-LLM core UI or agent runtime.
        *   Support for image generation providers other than OpenAI.
        *   Advanced features like image caching or complex prompt engineering within the skill.
        *   Support for DALL-E 2/3 specific features unless easily compatible with `gpt-image-1` workflow (Variations endpoint is DALL-E 2 only).
*   **Stakeholders:**
    *   Internal Development Team (responsible for building the skill).
    *   Product Owner (defining requirements and priorities).
    *   QA Team (testing the skill's functionality and reliability).
    *   End Users (utilizing the skill via the Anything-LLM agent).
