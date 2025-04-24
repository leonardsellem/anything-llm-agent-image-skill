 // CommonJS mock for the `openai` package, compatible with `require("openai")`
// Jest globals are already available; no need to re-require them

const mockGenerate = jest.fn();
const mockEdit = jest.fn();
const mockCreateVariation = jest.fn();

/**
 * Mock OpenAI constructor used by handler.js (called via `new OpenAI()`).
 * Each call returns an object with an `images` API containing our jest.fn mocks.
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
