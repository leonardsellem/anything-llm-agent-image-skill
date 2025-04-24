# Technical Context

*   **Core Technologies:**
    *   **Language:** JavaScript (ES Modules)
    *   **Runtime:** NodeJS 18+
    *   **Package Manager:** Yarn (as recommended by AnythingLLM docs, though npm could work)
    *   **Key Library:** `openai` (Official OpenAI Node.js SDK) for API interaction.
*   **Development Environment:**
    *   NodeJS version 18 or higher installed.
    *   Yarn package manager installed (`npm install -g yarn`).
    *   An environment variable `OPENAI_API_KEY` containing a valid OpenAI API key with access to `gpt-image-1`. (Consider using `dotenv` for local management).
    *   AnythingLLM instance running (Docker, Local Dev, or Desktop) to test the skill integration.
    *   Skill source code placed within the AnythingLLM storage directory under `plugins/agent-skills/{hubId}/`, where `{hubId}` matches the `hubId` in `plugin.json`.
*   **Build & Deployment:**
    *   **Build:** No explicit build step is required for this simple JavaScript skill. Ensure all dependencies are listed in `package.json` if used (though bundling might not be necessary if only using the `openai` SDK which can be included directly).
    *   **Deployment:** Create a folder named after the `hubId` (e.g., `openai-image-generation`). Place `plugin.json`, `handler.js`, `README.md`, and any node_modules (if bundling dependencies) inside this folder. Copy or mount this folder into the AnythingLLM instance's `STORAGE_DIR/plugins/agent-skills/` directory. AnythingLLM supports hot-loading; changes should be picked up automatically (may require exiting an active agent session or reloading the UI).
*   **Key Dependencies:**
    *   **External Service:** OpenAI API (specifically the Image API endpoints).
    *   **NPM Package:** `openai` (latest version recommended).
*   **Technical Constraints:**
    *   Must adhere to OpenAI API rate limits and usage policies.
    *   Image generation latency is dependent on OpenAI API response times (can be up to 2 minutes for complex prompts/high quality).
    *   Input image size limit of 25MB for the Edits endpoint.
    *   Mask images for inpainting must have an alpha channel and match the dimensions of the source image.
    *   The `handler.js` function *must* return a string value.
    *   Skill execution environment is NodeJS, limiting browser-specific APIs.
*   **Tooling:**
    *   **Linting:** ESLint (using a standard configuration like `eslint:recommended` or `airbnb-base`).
    *   **Formatting:** Prettier for consistent code style.
    *   **Testing:** Jest framework for unit testing `handler.js` logic (mocking the OpenAI API calls).
