import { Feedback } from '../../src/utils/feedback';

// Mock console.log
console.log = jest.fn();

describe('Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('success method logs with green color and checkmark emoji', () => {
    Feedback.success('Operation completed successfully');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Operation completed successfully'));
  });

  test('warning method logs with yellow color and warning emoji', () => {
    Feedback.warning('Proceed with caution');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Proceed with caution'));
  });

  test('error method logs with red color and error emoji', () => {
    Feedback.error('Operation failed');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Operation failed'));
  });

  test('info method logs with blue color and info emoji', () => {
    Feedback.info('Here is some information');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔍'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Here is some information'));
  });

  test('ai method logs with magenta color and robot emoji', () => {
    Feedback.ai('AI is processing your request');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🤖'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('AI is processing your request'));
  });

  test('process method logs with cyan color and process emoji', () => {
    Feedback.process('Running task sequence');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🔄'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Running task sequence'));
  });

  test('tip method logs with green color and lightbulb emoji', () => {
    Feedback.tip('Try this approach instead');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Try this approach instead'));
  });

  test('section method creates a section header', () => {
    Feedback.section('Configuration');
    expect(console.log).toHaveBeenCalledTimes(3); // Includes empty lines
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📋'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Configuration'));
  });

  test('subsection method creates a subsection header', () => {
    Feedback.subsection('Advanced Settings');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📌'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Advanced Settings'));
  });

  test('progress method allows custom emoji', () => {
    Feedback.progress('Installing dependencies', '📦');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📦'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installing dependencies'));
  });
});