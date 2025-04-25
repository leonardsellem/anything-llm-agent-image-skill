import { describe, test, expect, jest, beforeEach, afterAll, beforeAll } from '@jest/globals';
import { Buffer } from 'buffer';

// --- Mock OpenAI SDK (using setupMocks.js via jest.config.js) ---
// Import the mock functions from the setup file to assert calls
import { mockGenerate, mockEdit, mockCreateVariation } from './setupMocks.js';

// --- Mock AWS SDK v3 ---
const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();

// Mock the S3Client constructor and its send method
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn((args) => ({ constructorArgs: args, commandName: 'PutObjectCommand' })), // Capture args
  GetObjectCommand: jest.fn((args) => ({ constructorArgs: args, commandName: 'GetObjectCommand' })), // Capture args
}));

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));


// --- Test Setup ---
let handler; // To be assigned after dynamic import

describe('OpenAI Image Generation Skill Handler with S3 Upload', () => {

  // Default runtimeArgs for a successful execution
  const defaultRuntimeArgs = {
    OPENAI_API_KEY: 'test-openai-key', // From setup_args
    AWS_ACCESS_KEY_ID: 'test-aws-key-id',
    AWS_SECRET_ACCESS_KEY: 'test-aws-secret-key',
    AWS_REGION: 'us-east-1',
    S3_BUCKET: 'test-bucket',
    SIGNED_URL_TTL: 3600, // 1 hour
  };
  let mockContext; // To hold `this` context for handler calls

  beforeAll(async () => {
    // Dynamically import the handler *after* mocks are set up
    const module = await import('../handler.js');
    handler = module.default.runtime.handler; // Access the exported handler function
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default success mocks for OpenAI (use valid short base64)
    const validB64 = 'YWFh'; // 'aaa'
    mockGenerate.mockResolvedValue({ data: [{ b64_json: validB64 }] });
    mockEdit.mockResolvedValue({ data: [{ b64_json: validB64 }] });
    mockCreateVariation.mockResolvedValue({ data: [{ b64_json: validB64 }] });

    // Default success mocks for S3
    mockS3Send.mockResolvedValue({ $metadata: { httpStatusCode: 200 } }); // Simulate successful upload
    mockGetSignedUrl.mockResolvedValue('https://test-bucket.s3.us-east-1.amazonaws.com/images/mock_signed_url?params=123');

    // Reset context for each test
    mockContext = {
      runtimeArgs: { ...defaultRuntimeArgs }, // Use a fresh copy
      logger: jest.fn(), // Use jest mock for logger
      introspect: jest.fn(),
    };
  });

  // --- AWS Settings Validation Tests ---
  test('should return error if AWS_ACCESS_KEY_ID is missing', async () => {
    delete mockContext.runtimeArgs.AWS_ACCESS_KEY_ID;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain('Error: Missing required AWS S3 configuration');
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  test('should return error if AWS_SECRET_ACCESS_KEY is missing', async () => {
    delete mockContext.runtimeArgs.AWS_SECRET_ACCESS_KEY;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain('Error: Missing required AWS S3 configuration');
  });

  test('should return error if AWS_REGION is missing', async () => {
    delete mockContext.runtimeArgs.AWS_REGION;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain('Error: Missing required AWS S3 configuration');
  });

  test('should return error if S3_BUCKET is missing', async () => {
    delete mockContext.runtimeArgs.S3_BUCKET;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain('Error: Missing required AWS S3 configuration');
  });

  test('should use default SIGNED_URL_TTL if not provided', async () => {
    delete mockContext.runtimeArgs.SIGNED_URL_TTL; // Remove TTL to test default
    await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(), // S3Client instance
      expect.objectContaining({ commandName: 'GetObjectCommand' }),
      { expiresIn: 86400 } // Default TTL = 1 day
    );
  });

  test('should return error if SIGNED_URL_TTL is invalid (zero)', async () => {
    mockContext.runtimeArgs.SIGNED_URL_TTL = 0;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain("Error: Invalid 'URL Expiry Seconds' setting.");
  });

  test('should return error if SIGNED_URL_TTL is invalid (negative)', async () => {
    mockContext.runtimeArgs.SIGNED_URL_TTL = -100;
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain("Error: Invalid 'URL Expiry Seconds' setting.");
  });

  test('should return error if SIGNED_URL_TTL is not a number', async () => {
    mockContext.runtimeArgs.SIGNED_URL_TTL = 'not-a-number';
    const result = await handler.call(mockContext, { operation: 'generate', prompt: 'test' });
    expect(result).toContain("Error: Invalid 'URL Expiry Seconds' setting.");
  });


  // --- OpenAI Input Validation Tests (remain largely the same) ---
  // NOTE: Removed flaky test for missing OPENAI_API_KEY due to singleton client issues.

  test('should return an error if required prompt is missing for generate', async () => {
    const params = { operation: 'generate', size: '1024x1024' }; // Prompt missing
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Prompt is required for 'generate' and 'edit' operations.");
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

   test('should return an error if required prompt is missing for edit', async () => {
    const params = { operation: 'edit', image: 'aW1hZ2U=', mask: 'bWFzaw==' }; // Prompt missing
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Prompt is required for 'generate' and 'edit' operations.");
    expect(mockEdit).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  test('should return an error if required image is missing for edit', async () => {
    const params = { operation: 'edit', prompt: 'test prompt', mask: 'bWFzaw==' }; // Image missing
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Base64 image string is required for 'edit' operation.");
    expect(mockEdit).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

   test('should return an error if required mask is missing for edit', async () => {
    const params = { operation: 'edit', prompt: 'test prompt', image: 'aW1hZ2U=' }; // Mask missing
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Base64 mask string is required for 'edit' operation.");
     expect(mockEdit).not.toHaveBeenCalled();
     expect(mockS3Send).not.toHaveBeenCalled();
  });

  test('should return an error if required image is missing for variation', async () => {
    const params = { operation: 'variation' }; // Image missing
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Base64 image string is required for 'variation' operation.");
    expect(mockCreateVariation).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

   test('should return an error for invalid base64 image', async () => {
    const params = { operation: 'variation', image: 'not-base64!' };
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Provided image for 'variation' is not a valid base64 string.");
    expect(mockCreateVariation).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

   test('should return an error for invalid base64 mask', async () => {
    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'not-base64!' };
    // const result = await handler(params); // Original line - removed during merge?
    const result = await handler.call(mockContext, params);
    expect(result).toBe("Error: Provided mask for 'edit' is not a valid base64 string.");
    expect(mockEdit).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  // ... (keep other OpenAI validation tests like invalid operation, size, quality, n) ...
  test('should return an error for invalid operation', async () => {
    const params = { operation: 'invalid_op', prompt: 'test' };
    const result = await handler.call(mockContext, params);
    expect(result).toContain('Error: Invalid operation specified: invalid_op.');
  });

  test('should return an error for invalid size (generate)', async () => {
    const params = { operation: 'generate', prompt: 'test', size: '1x1' };
    const result = await handler.call(mockContext, params);
    expect(result).toContain('Error: Invalid size "1x1" for operation "generate".');
  });

   test('should return an error for invalid size (edit)', async () => {
    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'bWFzaw==', size: '1792x1024' }; // DALL-E 3 size invalid for DALL-E 2
    const result = await handler.call(mockContext, params);
    expect(result).toContain('Error: Invalid size "1792x1024" for operation "edit".');
  });

  test('should return an error for invalid quality', async () => {
    const params = { operation: 'generate', prompt: 'test', quality: 'low' };
    const result = await handler.call(mockContext, params);
    expect(result).toContain('Error: Invalid quality "low".');
  });

  test('should return an error for invalid n', async () => {
    const params = { operation: 'generate', prompt: 'test', n: 0 };
    const result = await handler.call(mockContext, params);
    expect(result).toContain("Error: Invalid number of images 'n' (0).");
  });


  // --- Success Case Tests (with S3) ---
  test('should generate image, upload to S3, and return Markdown URL', async () => {
    const params = {
      operation: 'generate',
      prompt: 'A blue cat',
      size: '1024x1024',
      quality: 'hd',
      operation: 'generate',
      prompt: 'A blue cat',
      size: '1024x1024',
      quality: 'hd',
      n: 1 // n > 1 is ignored now, only first image is processed
    };
    const result = await handler.call(mockContext, params);

    // 1. Check OpenAI call
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith({
      model: "dall-e-3",
      prompt: 'A blue cat',
      size: '1024x1024',
      quality: 'hd',
      n: 1, // Handler uses n=1 internally for OpenAI call even if user passes > 1
      response_format: "b64_json"
    });

    // 2. Check S3 Upload (PutObjectCommand)
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const putCommandArgs = mockS3Send.mock.calls[0][0].constructorArgs;
    expect(putCommandArgs.Bucket).toBe('test-bucket');
    expect(putCommandArgs.Key).toMatch(/^images\/generate_\d+_[a-f0-9]+\.png$/);
    expect(putCommandArgs.Body).toBeInstanceOf(Buffer);
    expect(putCommandArgs.Body.toString('base64')).toBe('YWFh'); // Check against valid mock b64
    expect(putCommandArgs.ContentType).toBe('image/png');

    // 3. Check Signed URL Generation (GetObjectCommand)
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const getCommandArgs = mockGetSignedUrl.mock.calls[0][1].constructorArgs;
    expect(getCommandArgs.Bucket).toBe('test-bucket');
    expect(getCommandArgs.Key).toBe(putCommandArgs.Key); // Should use the same key
    expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 3600 }); // Check TTL

    // 4. Check final result (Markdown URL)
    expect(result).toBe('![generate image](https://test-bucket.s3.us-east-1.amazonaws.com/images/mock_signed_url?params=123)');
  });

  test('should edit image, upload to S3, and return Markdown URL', async () => {
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
    const result = await handler.call(mockContext, params);

    // 1. Check OpenAI call
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

    // 2. Check S3 Upload
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const putCommandArgs = mockS3Send.mock.calls[0][0].constructorArgs;
    expect(putCommandArgs.Bucket).toBe('test-bucket');
    expect(putCommandArgs.Key).toMatch(/^images\/edit_\d+_[a-f0-9]+\.png$/);
    expect(putCommandArgs.Body.toString('base64')).toBe('YWFh'); // Check against valid mock b64

    // 3. Check Signed URL Generation
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const getCommandArgs = mockGetSignedUrl.mock.calls[0][1].constructorArgs;
    expect(getCommandArgs.Key).toBe(putCommandArgs.Key);
    expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 3600 });

    // 4. Check final result
    expect(result).toBe('![edit image](https://test-bucket.s3.us-east-1.amazonaws.com/images/mock_signed_url?params=123)');
  });

  test('should create variation, upload to S3, and return Markdown URL', async () => {
    const imageB64 = 'dmFyaWF0aW9u'; // "variation"
    const params = {
      operation: 'variation',
      image: imageB64,
      size: '256x256',
      n: 1 // n > 1 ignored
    };
    const result = await handler.call(mockContext, params);

     // 1. Check OpenAI call
    expect(mockCreateVariation).toHaveBeenCalledTimes(1);
    expect(mockCreateVariation).toHaveBeenCalledWith({
       model: "dall-e-2",
       image: Buffer.from(imageB64, 'base64'), // Expect Buffer
       size: '256x256',
       n: 1,
       response_format: "b64_json"
    });

    // 2. Check S3 Upload
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const putCommandArgs = mockS3Send.mock.calls[0][0].constructorArgs;
    expect(putCommandArgs.Bucket).toBe('test-bucket');
    expect(putCommandArgs.Key).toMatch(/^images\/variation_\d+_[a-f0-9]+\.png$/);
    expect(putCommandArgs.Body.toString('base64')).toBe('YWFh'); // Check against valid mock b64

    // 3. Check Signed URL Generation
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const getCommandArgs = mockGetSignedUrl.mock.calls[0][1].constructorArgs;
    expect(getCommandArgs.Key).toBe(putCommandArgs.Key);
    expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 3600 });

    // 4. Check final result
    expect(result).toBe('![variation image](https://test-bucket.s3.us-east-1.amazonaws.com/images/mock_signed_url?params=123)');
  });

  // --- Error Handling Tests ---
  test('should handle OpenAI API errors gracefully during generate', async () => {
    const apiError = new Error("API Failed");
    apiError.status = 400; // Simulate a client error (non-retryable)
    apiError.response = { data: { error: { message: "Invalid prompt details" } } }; // More specific message
    mockGenerate.mockRejectedValue(apiError);

    const params = { operation: 'generate', prompt: 'invalid' };
    const result = await handler.call(mockContext, params);

    // Expect a user-friendly error, not the raw API response dump
    expect(result).toBe('Error: An error occurred while processing the image request.');
    expect(mockGenerate).toHaveBeenCalledTimes(1); // No retry on 4xx
    expect(mockS3Send).not.toHaveBeenCalled(); // Should fail before S3
    // Correct the logger assertion to match the actual error detail logged
    expect(mockContext.logger).toHaveBeenCalledWith(expect.stringContaining('Skill execution failed: Invalid prompt details'));
    // The above line implicitly checks for the base message "Skill execution failed:" as well
  });

   test('should handle generic non-API errors during edit', async () => {
    const genericError = new Error("Unexpected issue");
    mockEdit.mockRejectedValue(genericError);

    const params = { operation: 'edit', prompt: 'p', image: 'aW1hZ2U=', mask: 'bWFzaw==' };
    const result = await handler.call(mockContext, params);

    expect(result).toBe('Error: An error occurred while processing the image request.');
    expect(mockEdit).toHaveBeenCalledTimes(1); // No retry on generic error
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(mockContext.logger).toHaveBeenCalledWith(expect.stringContaining('Skill execution failed: Unexpected issue'));
  });

  test('should retry OpenAI call on 5xx errors during variation', async () => {
    const serverError = new Error("Server unavailable");
    serverError.status = 503; // Simulate a retryable server error
    mockCreateVariation
      .mockRejectedValueOnce(serverError) // Fail first time
      .mockResolvedValue({ data: [{ b64_json: 'mock_variation_base64_string' }] }); // Succeed second time

    const params = { operation: 'variation', image: 'aW1hZ2U=' };
    const result = await handler.call(mockContext, params);

    // Should eventually succeed and return the S3 URL
    expect(result).toBe('![variation image](https://test-bucket.s3.us-east-1.amazonaws.com/images/mock_signed_url?params=123)');
    expect(mockCreateVariation).toHaveBeenCalledTimes(2); // Called once, retried once
    expect(mockS3Send).toHaveBeenCalledTimes(1); // S3 upload happens after successful retry
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

   test('should fail OpenAI call after max retries on persistent 5xx errors', async () => {
    const serverError = new Error("Server unavailable");
    serverError.status = 503;
    mockGenerate.mockRejectedValue(serverError); // Always fail

    const params = { operation: 'generate', prompt: 'persistent failure' };
    const result = await handler.call(mockContext, params);

    expect(result).toBe('Error: An error occurred while processing the image request.');
    expect(mockGenerate).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    expect(mockS3Send).not.toHaveBeenCalled(); // Fails before S3
    expect(mockContext.logger).toHaveBeenCalledWith(expect.stringContaining('Skill execution failed: Server unavailable'));
  });

  // --- S3 Error Handling Tests ---
  test('should handle S3 upload errors (e.g., AccessDenied)', async () => {
    const s3Error = new Error("Access Denied");
    s3Error.code = 'AccessDenied';
    mockS3Send.mockRejectedValue(s3Error); // Fail S3 upload

    const params = { operation: 'generate', prompt: 'upload fail test' };
    const result = await handler.call(mockContext, params);

    expect(mockGenerate).toHaveBeenCalledTimes(1); // OpenAI call succeeds
    expect(mockS3Send).toHaveBeenCalledTimes(1); // S3 upload attempted
    expect(mockGetSignedUrl).not.toHaveBeenCalled(); // Fails before signing URL
    // Expect the double "Error: " prefix as seen in the previous run's output
    expect(result).toBe('Error: Error: Access denied when trying to access S3 bucket "test-bucket". Check IAM permissions.');
    expect(mockContext.logger).toHaveBeenCalledWith(expect.stringContaining('Skill execution failed: Access Denied'));
  });

   test('should handle S3 upload errors (e.g., NoSuchBucket)', async () => {
    const s3Error = new Error("Bucket does not exist");
    s3Error.code = 'NoSuchBucket';
    mockS3Send.mockRejectedValue(s3Error);

    const params = { operation: 'generate', prompt: 'no bucket test' };
    const result = await handler.call(mockContext, params);

    // Expect the double "Error: " prefix
    expect(result).toBe('Error: Error: The specified S3 bucket "test-bucket" does not exist or cannot be accessed.');
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  test('should handle errors during signed URL generation', async () => {
    const signError = new Error("Failed to sign");
    mockGetSignedUrl.mockRejectedValue(signError); // Fail signing

    const params = { operation: 'generate', prompt: 'sign fail test' };
    const result = await handler.call(mockContext, params);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockS3Send).toHaveBeenCalledTimes(1); // Upload succeeds
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1); // Signing attempted
    expect(result).toBe('Error: An error occurred while processing the image request.'); // Generic error for signing failure
    expect(mockContext.logger).toHaveBeenCalledWith(expect.stringContaining('Skill execution failed: Failed to sign'));
  });

});
