import { Command } from 'commander';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('commander');
jest.mock('../src/utils/feedback');
jest.mock('../src/utils/file-merger');

// Mock of Command implementation
const mockCommand = {
  name: jest.fn().mockReturnThis(),
  description: jest.fn().mockReturnThis(),
  version: jest.fn().mockReturnThis(),
  option: jest.fn().mockReturnThis(),
  action: jest.fn().mockImplementation(function (callback) {
    this.actionCallback = callback;
    return this;
  }),
  parse: jest.fn(),
};

// Set up mocks before importing the module to be tested
(Command as unknown as jest.Mock).mockImplementation(() => mockCommand);

// Import the module to be tested (after setting up mocks)
import '../src/index';

describe('AI Coding Assistants Setup CLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should set up CLI correctly', () => {
    // Test CLI setup
    expect(mockCommand.name).toHaveBeenCalledWith('ai-coding-assistants-setup');
    expect(mockCommand.description).toHaveBeenCalled();
    expect(mockCommand.version).toHaveBeenCalled();
    expect(mockCommand.option).toHaveBeenCalledTimes(3); // -n, -f, -v options
    expect(mockCommand.action).toHaveBeenCalled();
    expect(mockCommand.parse).toHaveBeenCalled();
  });
});
