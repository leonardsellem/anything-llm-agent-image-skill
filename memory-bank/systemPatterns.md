# System Patterns

*   **Architecture Overview:** The skill follows the standard AnythingLLM Custom Agent Skill architecture. It's a self-contained plugin executed within the AnythingLLM NodeJS environment.
    ```mermaid
    graph LR
        A[AnythingLLM Agent] -- Invokes Skill --> B{Skill Runtime};
        B -- Loads & Executes --> C[handler.js];
        C -- Uses OpenAI SDK --> D[OpenAI Image API];
        D -- Returns Image Data --> C;
        C -- Returns base64 String --> B;
        B -- Passes Result --> A;
    ```
*   **Key Technical Decisions:**
    *   Utilize the official `openai` Node.js SDK for robust API interaction and future compatibility.
    *   Implement the skill in plain JavaScript (ES Modules) for simplicity and broad compatibility within the Node environment, avoiding transpilation steps.
    *   Return image data as base64-encoded strings, adhering to the `handler.js` return type constraint.
    *   Define skill parameters clearly in `plugin.json` to leverage AnythingLLM's ability to guide the LLM's function calls.
*   **Design Patterns:**
    *   **Singleton:** Potentially use a singleton pattern for the OpenAI client instance within `handler.js` to avoid redundant initializations on multiple calls within the same runtime lifecycle (if applicable to the skill runtime).
    *   **Adapter:** The `handler.js` acts as an adapter, translating the parameters defined in `plugin.json` (and provided by the LLM) into the specific structure required by the OpenAI SDK methods (`images.generate`, `images.edit`).
    *   **Facade:** The skill itself acts as a facade, simplifying the interaction with the potentially complex OpenAI Image API into a single function call for the AnythingLLM agent.
*   **Component Interaction:**
    *   The AnythingLLM Agent identifies the user's intent to generate/edit an image.
    *   It selects this skill based on the description and examples in `plugin.json`.
    *   It formulates a JSON call matching the `entrypoint.params` schema in `plugin.json`.
    *   The AnythingLLM Skill Runtime loads `handler.js` and executes its exported handler function, passing the JSON parameters and any `setup_args` values.
    *   `handler.js` initializes the OpenAI client (using the API key from `setup_args` or environment variables).
    *   `handler.js` calls the appropriate OpenAI `images.generate` or `images.edit` method.
    *   The OpenAI API processes the request and returns image data.
    *   `handler.js` formats the response (base64 string) and returns it to the Skill Runtime.
    *   The Skill Runtime passes the string back to the Agent.
*   **Data Flow:**
    `User Prompt -> Agent -> Skill Invocation (JSON Params) -> handler.js -> OpenAI API Request -> OpenAI API Response (Image Data) -> handler.js (Formats to base64) -> Agent -> User Display`
*   **Error Handling Strategy:**
    *   Wrap OpenAI API calls within `try...catch` blocks in `handler.js`.
    *   Catch errors from the OpenAI SDK (e.g., network issues, authentication errors, invalid requests, rate limits).
    *   Catch errors from input validation (if implemented, e.g., using zod).
    *   Format caught errors into user-friendly string messages (e.g., "Error generating image: [OpenAI Error Message]" or "Invalid parameter: [Details]").
    *   Return the error string as the result from `handler.js`. The AnythingLLM agent should then surface this error to the user.
    *   Consider implementing basic retries (e.g., 2-3 attempts with exponential backoff) for transient network errors before failing.
