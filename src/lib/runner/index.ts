import { CodeFile, ExecutionResult, SupportedLanguage } from '@/types';
import { ICodeRunner } from './types';
import { JavaScriptRunner } from './javascript';
import { PyodideRunner } from './pyodide';

// Phase 2 Extensible Docker Runner Stub (ready for Container/Piston/code-server integration)
export class DockerContainerRunner implements ICodeRunner {
  language: string;
  private apiEndpoint: string;

  constructor(language: string, apiEndpoint = '/api/runner/docker') {
    this.language = language;
    this.apiEndpoint = apiEndpoint;
  }

  async execute(
    code: string,
    files: CodeFile[],
    activeFileName: string
  ): Promise<ExecutionResult> {
    // Staging stub for Phase 2: Send code payload to remote isolated container
    console.info(`[DockerContainerRunner] Staged execution for ${activeFileName} via ${this.apiEndpoint}`);
    return {
      stdout: `[Docker Container Worker] Allocated sandbox for ${activeFileName}.\nOutput stream attached.\n(Phase 2 Remote Container Pipeline)`,
      stderr: '',
      exitCode: 0,
      executionTimeMs: 120
    };
  }
}

// Runner Singleton Registry
const pyodideRunner = new PyodideRunner();
const jsRunner = new JavaScriptRunner();

export async function runCode(
  language: SupportedLanguage,
  code: string,
  files: CodeFile[],
  activeFileName: string
): Promise<ExecutionResult> {
  if (language === 'python') {
    return pyodideRunner.execute(code, files, activeFileName);
  } else if (language === 'javascript') {
    return jsRunner.execute(code, files, activeFileName);
  } else if (language === 'html') {
    // HTML is displayed in live preview iframe, but can also be checked
    return {
      stdout: `[HTML/CSS Preview Active] Rendered ${files.length} document files.`,
      stderr: '',
      exitCode: 0,
      executionTimeMs: 15
    };
  }

  return {
    stdout: '',
    stderr: `Unsupported language: ${language}`,
    exitCode: 1,
    executionTimeMs: 0
  };
}
