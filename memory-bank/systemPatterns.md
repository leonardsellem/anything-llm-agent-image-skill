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
    *   Implement the skill in plain JavaScript as CommonJS module (using `module.exports`) to comply with AnythingLLM's skill loading requirements.
    *   Return image data as base64-encoded strings, adhering to the `handler.js` return type constraint.
    *   Define skill parameters clearly in `plugin.json` to leverage AnythingLLM's ability to guide the LLM's function calls.
    *   Ensure `plugin.json` includes the required fields: `schema: "skill-1.0.0"`, `version`, `active`, `name`, and `description`.
*   **Design Patterns:**
    *   **Singleton:** Implemented a singleton pattern for the OpenAI client instance within `handler.js` to avoid redundant initializations on multiple calls within the same runtime lifecycle.
    *   **Module Exports Pattern:** Follows the CommonJS pattern required by AnythingLLM, exporting the runtime object with a handler function: `module.exports.runtime = { handler: async function(...) {...} }`.
    *   **Safe Context Pattern:** Implemented defensive checks for runtime context (e.g., `this.introspect`, `this.logger`) to handle cases where the handler is called without runtime context (such as in unit tests).
    *   **Adapter:** The `handler.js` acts as an adapter, translating the parameters defined in `plugin.json` (and provided by the LLM) into the specific structure required by the OpenAI SDK methods (`images.generate`, `images.edit`, `images.createVariation`).
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
    *   Wrapped OpenAI API calls within `try...catch` blocks in `handler.js`.
    *   Implemented retries for transient errors (HTTP 5xx status codes and network errors) with exponential backoff.
    *   Added extensive input validation for all parameters with specific error messages for different failure cases.
    *   Handled OpenAI SDK errors (e.g., network issues, authentication errors, invalid requests, rate limits).
    *   Formatted caught errors into user-friendly string messages that can be surfaced by the AnythingLLM agent to the user.
    *   Created specialized error handling for authentication failures.
    *   **Handler Error Formatting:** When the `handler.js` catches errors, format the returned error string consistently. Start with `"Error: "` followed by a user-friendly message. Avoid nesting or doubling the "Error: " prefix. Log more detailed technical information (like stack traces or specific API error codes) internally using `_log` or `console.error`, but do not expose these raw details in the string returned to the agent/user unless absolutely necessary for debugging configuration issues (like missing settings).
