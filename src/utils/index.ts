export * from './commit-lint-setup';
export * from './config-merger';
export * from './docs-setup';
export * from './feedback';
export * from './file-merger';
export * from './formatting-setup';
export * from './github-actions-setup';
export * from './husky-setup';
export * from './linting-setup';
export * from './project-detector';
export * from './template-scanner';
export * from './uninstaller';
export * from './vscode-setup';

import CommitLintSetup from './commit-lint-setup';
import {
  ConfigFileType,
  ConfigMerger,
  ConflictStrategy,
} from './config-merger';
import DocsSetup from './docs-setup';
import Feedback from './feedback';
import { FileMerger, MergeOption } from './file-merger';
import PrettierSetup from './formatting-setup';
import GitHubActionsSetup from './github-actions-setup';
import { HuskySetup } from './husky-setup';
import ESLintSetup from './linting-setup';
import ProjectDetector from './project-detector';
import { TemplateScanner } from './template-scanner';
import Uninstaller from './uninstaller';
import VSCodeSetup from './vscode-setup';

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
  DocsSetup,
  GitHubActionsSetup,
  VSCodeSetup,
  Uninstaller,
};
