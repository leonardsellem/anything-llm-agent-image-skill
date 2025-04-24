# Technical Context

*   **Core Technologies:**
    *   **Language:** JavaScript (CommonJS modules - required by AnythingLLM)
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
    *   The `handler.js` file **must** export `module.exports.runtime.handler` function (CommonJS format).
    *   The handler function *must* return a string value.
    *   AnythingLLM loads agent skills via `require()`, which requires CommonJS exports.
    *   Custom agent skills must include mandatory `plugin.json` fields: `schema: "skill-1.0.0"`, `version`, `active`, `name`, and `description`.
    *   Skill execution environment is NodeJS, limiting browser-specific APIs.
*   **Tooling:**
    *   **Linting:** ESLint (using a standard configuration like `eslint:recommended` or `airbnb-base`).
    *   **Formatting:** Prettier for consistent code style.
    *   **Testing:** Jest framework for unit testing `handler.js` logic (mocking the OpenAI API calls).

### Jest Configuration for Testing CommonJS Skills with ESM Tests

Our mixed configuration (ESM tests testing CommonJS code) involves a unique pattern:

1.  **Dependencies (`devDependencies` in `package.json`):**
    *   `jest`
    *   `@jest/globals` (for importing `describe`, `test`, etc. in test files)
    *   `@babel/core`
    *   `@babel/preset-env`
    *   `babel-jest`

2.  **Babel Configuration (`babel.config.js`):** Configure Babel to target the current Node environment.
    ```javascript
    // babel.config.js
    module.exports = {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    };
    ```

3.  **Jest Configuration (`jest.config.js`):**
    *   Use `moduleNameMapper` to redirect `require('openai')` calls to our mock file.
    *   Use `setupFilesAfterEnv` to run the mock setup *before* tests.
    ```javascript
    // jest.config.js
    module.exports = {
      moduleNameMapper: {
        // Redirect 'openai' imports to the mock setup file
        '^openai$': '<rootDir>/__tests__/setupMocks.js'
      },
      setupFilesAfterEnv: ['./__tests__/setupMocks.js']
    };
    ```

4.  **Mock Setup File (`__tests__/setupMocks.js`):** Create mocks for CommonJS require pattern.
    ```javascript
    // __tests__/setupMocks.js
    // CommonJS mock for the `openai` package, compatible with `require("openai")`
    
    const mockGenerate = jest.fn();
    const mockEdit = jest.fn();
    const mockCreateVariation = jest.fn();
    
    /**
     * Mock OpenAI constructor used by handler.js (called via `new OpenAI()`).
     */
    function MockOpenAI () {
      return {
        images: {
          generate: mockGenerate,
          edit: mockEdit,
          createVariation: mockCreateVariation
        }
      };
    }
    
    // Export constructor as module.exports so `require('openai')` gets it
    module.exports = MockOpenAI;
    
    // Also export the individual jest mock functions for tests
    module.exports.mockGenerate = mockGenerate;
    module.exports.mockEdit = mockEdit;
    module.exports.mockCreateVariation = mockCreateVariation;
    ```

5.  **Test File (`*.test.js`):**
    *   Import Jest globals (`describe`, `test`, etc.) from `@jest/globals`.
    *   Import mock exports from the setup file.
    *   Use `beforeAll` with `await import('../handler.js')` to dynamically import the CommonJS module.
    *   Access the CommonJS exports via the `default` property: `module.default.runtime.handler`
    ```javascript
    // __tests__/handler.test.js
    import { describe, test, expect, jest, beforeEach, afterAll, beforeAll } from '@jest/globals';
    import { mockGenerate, mockEdit, mockCreateVariation } from './setupMocks.js';
    
    let handler; // Variable for dynamically imported function
    
    describe('OpenAI Image Generation Skill Handler', () => {
      beforeAll(async () => {
        // Import CommonJS module dynamically
        const module = await import('../handler.js');
        // CommonJS exports appear under default property
        handler = module.default.runtime.handler;
      });
    
      // ... your tests using handler ...
    });
    ```

6. **Important**: When calling the handler in tests, provide a safe execution context. The handler may reference `this.introspect` and `this.logger` which are normally provided by the AnythingLLM runtime. One approach is to add null checking in the handler:

   ```javascript
   const _introspect = 
     typeof this === "object" && typeof this.introspect === "function"
       ? this.introspect.bind(this)
       : () => {};
   ```
