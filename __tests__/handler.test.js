import { describe, test, expect, jest, beforeEach, afterAll, beforeAll } from '@jest/globals';
// Import the mock functions from the setup file
import { mockGenerate, mockEdit, mockCreateVariation } from './setupMocks.js';
import { Buffer } from 'buffer';

// Declare handler variable to be assigned after dynamic import
let handler;

// Store original process.env
const originalEnv = process.env;

describe('OpenAI Image Generation Skill Handler', () => {

  // Dynamically import the handler *after* the mock is set up via jest.config.js -> setupFilesAfterEnv
  beforeAll(async () => {
    // The moduleNameMapper in jest.config.js should handle redirecting 'openai'
    // imports within handler.js to our mock in setupMocks.js
    const module = await import('../handler.js');
    handler = module.handler;
  });

  // Reset mocks and environment variables before each test
  beforeEach(() => {
    // Clear mock function calls
    mockGenerate.mockClear();
    mockEdit.mockClear();
    mockCreateVariation.mockClear();

    // Reset mock implementations to default success for each test
    mockGenerate.mockResolvedValue({ data: [{ b64_json: 'mock_generated_base64_string' }] });
    mockEdit.mockResolvedValue({ data: [{ b64_json: 'mock_edited_base64_string' }] });
    mockCreateVariation.mockResolvedValue({ data: [{ b64_json: 'mock_variation_base64_string' }] });

    // Set a default mock API key for most tests
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key-123' };
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  // --- Validation Tests ---
  test('should return error if OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY; // Remove key for this test
    const params = { operation: 'generate', prompt: 'test' };
    // Reset the singleton client in handler.js for this specific test case if possible,
    // otherwise this test might rely on the state from previous tests.
    // For simplicity, we assume the handler re-checks env var or re-initializes client if needed.
    // A more robust solution might involve resetting the handler's internal state.
    const result = await handler(params);
    // Check the specific error message returned when the key is missing during execution
    expect(result).toContain('Error: OpenAI API Key (OPENAI_API_KEY) is not configured');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  test('should return an error if required prompt is missing for generate', async () => {
    const params = { operation: 'generate', size: '1024x1024' }; // Prompt missing
    const result = await handler(params);
    expect(result).toBe("Error: Prompt is required for 'generate' and 'edit' operations.");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

   test('should return an error if required prompt is missing for edit', async () => {
    const params = { operation: 'edit', image: 'aW1hZ2U=', mask: 'bWFzaw==' }; // Prompt missing
    const result = await handler(params);
    expect(result).toBe("Error: Prompt is required for 'generate' and 'edit' operations.");
    expect(mockEdit).not.toHaveBeenCalled();
  });

  test('should return an error if required image is missing for edit', async () => {
    const params = { operation: 'edit', prompt: 'test prompt', mask: 'bWFzaw==' }; // Image missing
    const result = await handler(params);
    expect(result).toBe("Error: Base64 image string is required for 'edit' operation.");
    expect(mockEdit).not.toHaveBeenCalled();
  });

   test('should return an error if required mask is missing for edit', async () => {
    const params = { operation: 'edit', prompt: 'test prompt', image: 'aW1hZ2U=' }; // Mask missing
    const result = await handler(params);
    expect(result).toBe("Error: Base64 mask string is required for 'edit' operation.");
     expect(mockEdit).not.toHaveBeenCalled();
  });

  test('should return an error if required image is missing for variation', async () => {
    const params = { operation: 'variation' }; // Image missing
    const result = await handler(params);
    expect(result).toBe("Error: Base64 image string is required for 'variation' operation.");
    expect(mockCreateVariation).not.toHaveBeenCalled();
  });

   test('should return an error for invalid base64 image', async () => {
    const params = { operation: 'variation', image: 'not-base64!' };
    const result = await handler(params);
    expect(result).toBe("Error: Provided image for 'variation' is not a valid base64 string.");
    expect(mockCreateVariation).not.toHaveBeenCalled();
  });

   test('should return an error for invalid base64 mask', async () => {
    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'not-base64!' };
    const result = await handler(params);
    expect(result).toBe("Error: Provided mask for 'edit' is not a valid base64 string.");
    expect(mockEdit).not.toHaveBeenCalled();
  });


  test('should return an error for invalid operation', async () => {
    const params = { operation: 'invalid_op', prompt: 'test' };
    const result = await handler(params);
    expect(result).toContain('Error: Invalid operation specified: invalid_op.');
  });

  test('should return an error for invalid size (generate)', async () => {
    const params = { operation: 'generate', prompt: 'test', size: '1x1' };
    const result = await handler(params);
    expect(result).toContain('Error: Invalid size "1x1" for operation "generate".');
  });

   test('should return an error for invalid size (edit)', async () => {
    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'bWFzaw==', size: '1792x1024' }; // DALL-E 3 size invalid for DALL-E 2
    const result = await handler(params);
    expect(result).toContain('Error: Invalid size "1792x1024" for operation "edit".');
  });

  test('should return an error for invalid quality', async () => {
    const params = { operation: 'generate', prompt: 'test', quality: 'low' };
    const result = await handler(params);
    expect(result).toContain('Error: Invalid quality "low".');
  });

  test('should return an error for invalid n', async () => {
    const params = { operation: 'generate', prompt: 'test', n: 0 };
    const result = await handler(params);
    expect(result).toContain("Error: Invalid number of images 'n' (0).");
  });


  // --- Success Case Tests ---
  test('should call openai.images.generate with correct params for generate operation', async () => {
    const params = {
      operation: 'generate',
      prompt: 'A blue cat',
      size: '1024x1024',
      quality: 'hd',
      n: 2
    };
    const result = await handler(params);

    expect(result).toBe('mock_generated_base64_string');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith({
      model: "dall-e-3",
      prompt: 'A blue cat',
      size: '1024x1024',
      quality: 'hd',
      n: 2,
      response_format: "b64_json"
    });
    expect(mockEdit).not.toHaveBeenCalled();
    expect(mockCreateVariation).not.toHaveBeenCalled();
  });

  test('should call openai.images.edit with correct params (including Buffers) for edit operation', async () => {
     const imageB64 = 'aW1hZ2U='; // "image"
     const maskB64 = 'bWFzaw==';   // "mask"
     const params = {
      operation: 'edit',
      prompt: 'Add a hat',
      image: imageB64,
      mask: maskB64,
      size: '512x512',
      n: 1
    };
    const result = await handler(params);

    expect(result).toBe('mock_edited_base64_string');
    expect(mockEdit).toHaveBeenCalledTimes(1);
    expect(mockEdit).toHaveBeenCalledWith({
      model: "dall-e-2",
      prompt: 'Add a hat',
      image: Buffer.from(imageB64, 'base64'), // Expect Buffer
      mask: Buffer.from(maskB64, 'base64'),   // Expect Buffer
      size: '512x512',
      n: 1,
      response_format: "b64_json"
    });
     expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockCreateVariation).not.toHaveBeenCalled();
  });

  test('should call openai.images.createVariation with correct params (including Buffer) for variation operation', async () => {
    const imageB64 = 'dmFyaWF0aW9u'; // "variation"
    const params = {
      operation: 'variation',
      image: imageB64,
      size: '256x256',
      n: 3
    };
    const result = await handler(params);

    expect(result).toBe('mock_variation_base64_string');
    expect(mockCreateVariation).toHaveBeenCalledTimes(1);
    expect(mockCreateVariation).toHaveBeenCalledWith({
       model: "dall-e-2",
       image: Buffer.from(imageB64, 'base64'), // Expect Buffer
       size: '256x256',
       n: 3,
       response_format: "b64_json"
    });
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });

   test('should return only the first image if n > 1', async () => {
    mockGenerate.mockResolvedValue({
      data: [
        { b64_json: 'first_image' },
        { b64_json: 'second_image' }
      ]
    });
    const params = { operation: 'generate', prompt: 'two images', n: 2 };
    const result = await handler(params);
    expect(result).toBe('first_image');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });


  // --- Error Handling Tests ---
  test('should handle API errors gracefully during generate', async () => {
    const apiError = new Error("API Failed");
    apiError.status = 400; // Simulate a client error
    apiError.response = { data: { error: { message: "Invalid prompt" } } };
    mockGenerate.mockRejectedValue(apiError);

    const params = { operation: 'generate', prompt: 'invalid' };
    const result = await handler(params);

    expect(result).toContain('Error: Failed to generate image.');
    expect(result).toContain('API Error 400: {"message":"Invalid prompt"}');
    expect(mockGenerate).toHaveBeenCalledTimes(1); // Should not retry on 400
  });

   test('should handle generic errors during edit', async () => {
    const genericError = new Error("Network issue");
    mockEdit.mockRejectedValue(genericError);

    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'bWFzaw==' };
    const result = await handler(params);

    expect(result).toContain('Error: Failed to edit image.');
    expect(result).toContain('Network issue');
    expect(mockEdit).toHaveBeenCalledTimes(1); // Should not retry on generic non-5xx/network error
  });

  test('should retry on 5xx errors during variation', async () => {
    const serverError = new Error("Server unavailable");
    serverError.status = 503; // Simulate a server error
    mockCreateVariation
      .mockRejectedValueOnce(serverError) // Fail first time
      .mockResolvedValue({ data: [{ b64_json: 'retry_success_variation' }] }); // Succeed second time

    const params = { operation: 'variation', image: 'aW1hZ2U=' };
    const result = await handler(params);

    expect(result).toBe('retry_success_variation');
    expect(mockCreateVariation).toHaveBeenCalledTimes(2); // Called once, retried once
  });

   test('should fail after max retries on persistent 5xx errors', async () => {
    const serverError = new Error("Server unavailable");
    serverError.status = 503;
    mockGenerate.mockRejectedValue(serverError); // Always fail

    const params = { operation: 'generate', prompt: 'persistent failure' };
    const result = await handler(params);

    expect(result).toContain('Error: Failed to generate image.');
    expect(result).toContain('Server unavailable');
    expect(mockGenerate).toHaveBeenCalledTimes(3); // Initial call + 2 retries
  });

});
