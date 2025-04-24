# Product Context

*   **Problem Solved:** Currently, Anything-LLM agents cannot generate images directly within a chat. Users needing images must use external tools or websites, breaking the workflow. This skill allows the agent to fulfill image requests programmatically.
*   **Target Audience:**
    *   End users of Anything-LLM who want the agent to generate visual content (diagrams, illustrations, photos) based on prompts.
    *   Developers creating custom agent workflows that require dynamic image generation.
*   **Core Functionality:** From the user's perspective, they issue a prompt to the agent (e.g., "Generate an image of a futuristic cityscape"). The agent invokes this skill, passing the prompt and any inferred or default parameters. The skill calls the OpenAI API and returns the generated image (as a base64 string) back to the agent, which then displays it or makes it available to the user. The skill should handle basic variations like requesting edits or different sizes if specified.
*   **User Experience Goals:**
    *   **Simplicity:** Minimal required input (just the prompt). Optional parameters should have sensible defaults.
    *   **Reliability:** Consistent image generation based on the prompt. Graceful handling of API errors or invalid inputs.
    *   **Efficiency:** Return images reasonably quickly (target < 5-10 seconds average, acknowledging API latency).
    *   **Clarity:** Clear error messages if generation fails.
*   **Success Metrics:**
    *   **Adoption:** Number of active Anything-LLM instances enabling this skill. Weekly usage frequency.
    *   **Performance:** Average latency for image generation requests. API success rate (non-error responses).
    *   **Quality:** User satisfaction ratings or feedback on generated image relevance and quality.
    *   **Reliability:** Rate of skill execution errors (distinct from API errors).
