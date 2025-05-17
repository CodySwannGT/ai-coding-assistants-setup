import fs from 'fs-extra';
import path from 'path';
import { FileMerger, MergeOption } from '../../src/utils/file-merger';

// Mock fs-extra
jest.mock('fs-extra');

// Mock readline
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((query, callback) => callback('s')), // Default to 'skip' for tests
    close: jest.fn(),
  })),
}));

// Mock feedback
jest.mock('../../src/utils/feedback', () => ({
  Feedback: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    section: jest.fn(),
  },
}));

describe('FileMerger', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeFile', () => {
    it('should copy file when target does not exist', async () => {
      // Setup
      const sourcePath = '/source/file.txt';
      const targetPath = '/target/file.txt';

      // Mock fs.existsSync to return true for source and false for target
      (fs.existsSync as jest.Mock)
        .mockImplementationOnce(() => true) // Source exists
        .mockImplementationOnce(() => false); // Target doesn't exist

      // Mock fs.copyFile to resolve
      jest.spyOn(fs, 'copyFile').mockResolvedValue(undefined);

      // Mock fs.mkdirpSync to do nothing
      (fs.mkdirpSync as jest.Mock).mockImplementation(() => {});

      // Execute
      const result = await FileMerger.mergeFile(sourcePath, targetPath);

      // Verify
      expect(result).toBe(true);
      expect(fs.mkdirpSync).toHaveBeenCalledWith(path.dirname(targetPath));
      expect(fs.copyFile).toHaveBeenCalledWith(sourcePath, targetPath);
    });

    it('should handle source file not existing', async () => {
      // Setup
      const sourcePath = '/source/nonexistent.txt';
      const targetPath = '/target/file.txt';

      // Mock fs.existsSync to return false (source doesn't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Execute
      const result = await FileMerger.mergeFile(sourcePath, targetPath);

      // Verify
      expect(result).toBe(false);
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    it('should handle file copy errors', async () => {
      // Setup
      const sourcePath = '/source/file.txt';
      const targetPath = '/target/file.txt';

      // Mock fs.existsSync to return true for source and false for target
      (fs.existsSync as jest.Mock)
        .mockImplementationOnce(() => true) // Source exists
        .mockImplementationOnce(() => false); // Target doesn't exist

      // Mock fs.copyFile to reject with an error
      jest.spyOn(fs, 'copyFile').mockRejectedValue(new Error('Copy failed'));

      // Execute
      const result = await FileMerger.mergeFile(sourcePath, targetPath);

      // Verify
      expect(result).toBe(false);
    });

    it('should overwrite existing file when option is OVERWRITE', async () => {
      // Setup
      const sourcePath = '/source/file.txt';
      const targetPath = '/target/file.txt';

      // Mock fs.existsSync to return true for both source and target
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.copyFile to resolve
      jest.spyOn(fs, 'copyFile').mockResolvedValue(undefined);

      // Execute
      const result = await FileMerger.mergeFile(
        sourcePath,
        targetPath,
        MergeOption.OVERWRITE,
        false // non-interactive
      );

      // Verify
      expect(result).toBe(true);
      expect(fs.copyFile).toHaveBeenCalledWith(sourcePath, targetPath);
    });

    it('should keep both files when option is KEEP_BOTH', async () => {
      // Setup
      const sourcePath = '/source/file.txt';
      const targetPath = '/target/file.txt';
      const backupPath = `${targetPath}.new`;

      // Mock fs.existsSync to return true for both source and target
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.copyFile to resolve
      jest.spyOn(fs, 'copyFile').mockResolvedValue(undefined);

      // Execute
      const result = await FileMerger.mergeFile(
        sourcePath,
        targetPath,
        MergeOption.KEEP_BOTH,
        false // non-interactive
      );

      // Verify
      expect(result).toBe(true);
      expect(fs.copyFile).toHaveBeenCalledWith(sourcePath, backupPath);
    });

    it('should skip file when option is SKIP', async () => {
      // Setup
      const sourcePath = '/source/file.txt';
      const targetPath = '/target/file.txt';

      // Mock fs.existsSync to return true for both source and target
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Execute
      const result = await FileMerger.mergeFile(
        sourcePath,
        targetPath,
        MergeOption.SKIP,
        false // non-interactive
      );

      // Verify
      expect(result).toBe(true);
      expect(fs.copyFile).not.toHaveBeenCalled();
    });
  });

  describe('mergeFiles', () => {
    it('should merge multiple files successfully', async () => {
      // Setup
      const files = new Map<string, string>([
        ['/source/file1.txt', '/target/file1.txt'],
        ['/source/file2.txt', '/target/file2.txt'],
      ]);

      // Mock mergeFile to succeed
      jest.spyOn(FileMerger, 'mergeFile').mockResolvedValue(true);

      // Execute
      const result = await FileMerger.mergeFiles(files);

      // Verify
      expect(result).toBe(2);
      expect(FileMerger.mergeFile).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures when merging multiple files', async () => {
      // Setup
      const files = new Map<string, string>([
        ['/source/file1.txt', '/target/file1.txt'],
        ['/source/file2.txt', '/target/file2.txt'],
        ['/source/file3.txt', '/target/file3.txt'],
      ]);

      // Mock mergeFile to succeed for two files and fail for one
      jest
        .spyOn(FileMerger, 'mergeFile')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Execute
      const result = await FileMerger.mergeFiles(files);

      // Verify
      expect(result).toBe(2);
      expect(FileMerger.mergeFile).toHaveBeenCalledTimes(3);
    });
  });
});
