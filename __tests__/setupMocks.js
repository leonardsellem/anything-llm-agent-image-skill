import { jest } from '@jest/globals';

const mockGenerate = jest.fn();
const mockEdit = jest.fn();
const mockCreateVariation = jest.fn();

// Mock the OpenAI constructor directly
const mockOpenAI = jest.fn().mockImplementation(() => ({
  images: {
    generate: mockGenerate,
    edit: mockEdit,
    createVariation: mockCreateVariation,
  }
}));

// Export the mocks and the mock constructor
export { mockOpenAI, mockGenerate, mockEdit, mockCreateVariation };

// We need to export the mock constructor as the default export
// to match how 'openai' is likely imported (import OpenAI from 'openai')
// This is crucial for the moduleNameMapper to work correctly.
export default mockOpenAI;
