export * from './feedback';
export * from './file-merger';
export * from './config-merger';
export * from './project-detector';
export * from './husky-setup';
export * from './template-scanner';
export * from './linting-setup';
export * from './formatting-setup';
export * from './commit-lint-setup';
export * from './github-actions-setup';
export * from './vscode-setup';
export * from './uninstaller';

import Feedback from './feedback';
import { FileMerger, MergeOption } from './file-merger';
import { ConfigMerger, ConflictStrategy, ConfigFileType } from './config-merger';
import ProjectDetector from './project-detector';
import HuskySetup from './husky-setup';
import TemplateScanner from './template-scanner';
import ESLintSetup from './linting-setup';
import PrettierSetup from './formatting-setup';
import CommitLintSetup from './commit-lint-setup';
import GitHubActionsSetup from './github-actions-setup';
import VSCodeSetup from './vscode-setup';
import Uninstaller from './uninstaller';

export default {
  Feedback,
  FileMerger,
  MergeOption,
  ConfigMerger,
  ConflictStrategy,
  ConfigFileType,
  ProjectDetector,
  HuskySetup,
  TemplateScanner,
  ESLintSetup,
  PrettierSetup,
  CommitLintSetup,
  GitHubActionsSetup,
  VSCodeSetup,
  Uninstaller
};