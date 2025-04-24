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

### Jest ESM Configuration

When testing projects using native ES Modules (`"type": "module"` in `package.json`) with Jest, especially when mocking ESM dependencies like `openai`, the following configuration proved successful:

1.  **Dependencies (`devDependencies` in `package.json`):**
    *   `jest`
    *   `@jest/globals` (for importing `describe`, `test`, etc. in test files)
    *   `@babel/core`
    *   `@babel/preset-env`
    *   `babel-jest`

2.  **Babel Configuration (`babel.config.js`):** Configure Babel to target the current Node environment.
    ```javascript
    // babel.config.js
    export default {
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
    *   Use `babel-jest` for transformations.
    *   Crucially, use `transformIgnorePatterns` to ensure necessary ESM modules within `node_modules` (like `openai`) *are* transformed by Babel.
    *   Use `moduleNameMapper` to redirect imports of the mocked module to a dedicated setup file.
    *   Use `setupFilesAfterEnv` to run the mock setup *before* tests.
    ```javascript
    // jest.config.js
    export default {
      testEnvironment: 'node',
      transform: {
        '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
      },
      transformIgnorePatterns: [
        // Allow transforming specific ESM modules in node_modules
        '/node_modules/(?!(openai)/)' // Add other ESM modules here if needed
      ],
      setupFilesAfterEnv: ['./__tests__/setupMocks.js'], // Path to your mock setup
      moduleNameMapper: {
        // Redirect 'openai' imports to the mock setup file
        '^openai$': '<rootDir>/__tests__/setupMocks.js'
      },
      testMatch: [ // Optional: Ensure only *.test.js files run
        '**/__tests__/**/*.test.js?(x)',
        '**/?(*.)+(spec|test).js?(x)'
      ]
    };
    ```

4.  **Mock Setup File (`__tests__/setupMocks.js`):** Create a separate file to define and export mocks. Export the mock constructor as the `default` export for `moduleNameMapper`.
    ```javascript
    // __tests__/setupMocks.js
    import { jest } from '@jest/globals';

    const mockGenerate = jest.fn();
    // ... other mock functions ...

    const mockOpenAI = jest.fn().mockImplementation(() => ({
      images: {
        generate: mockGenerate,
        // ... other mocked methods ...
      }
    }));

    export { mockOpenAI, mockGenerate /*, ... */ };
    export default mockOpenAI; // IMPORTANT for moduleNameMapper
    ```

5.  **Test File (`*.test.js`):**
    *   Import Jest globals (`describe`, `test`, etc.) from `@jest/globals`.
    *   Import the *mock functions* (not the mock constructor) from the setup file.
    *   Use `beforeAll` with `await import('../your-module.js')` to dynamically import the code under test *after* Jest has set up the mocks via `setupFilesAfterEnv` and `moduleNameMapper`.
    ```javascript
    // __tests__/yourModule.test.js
    import { describe, test, expect, jest, beforeEach, afterAll, beforeAll } from '@jest/globals';
    import { mockGenerate /*, ... */ } from './setupMocks.js'; // Import mocks

    let yourModuleHandler; // Variable for dynamically imported function

    describe('Your Module', () => {
      beforeAll(async () => {
        const module = await import('../your-module.js');
        yourModuleHandler = module.handler; // Or whatever is exported
      });

      beforeEach(() => {
        mockGenerate.mockClear();
        // Reset mocks...
      });

      // ... your tests using yourModuleHandler ...
    });
    ```
