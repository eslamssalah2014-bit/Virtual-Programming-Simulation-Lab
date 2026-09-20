import { CodeFile, ExecutionResult } from '@/types';

export interface ICodeRunner {
  language: string;
  execute(
    code: string,
    files: CodeFile[],
    activeFileName: string
  ): Promise<ExecutionResult>;
}

export interface RunnerOptions {
  timeoutMs?: number;
  environmentVariables?: Record<string, string>;
}
