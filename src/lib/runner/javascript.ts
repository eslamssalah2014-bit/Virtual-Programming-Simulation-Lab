import { CodeFile, ExecutionResult } from '@/types';
import { ICodeRunner } from './types';

export class JavaScriptRunner implements ICodeRunner {
  language = 'javascript';

  async execute(
    code: string,
    files: CodeFile[],
    activeFileName: string
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const stdoutLogs: string[] = [];
    const stderrLogs: string[] = [];

    // Intercept console
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    try {
      // Build simulated module environment if other files exist
      const moduleMap: Record<string, any> = {};
      
      console.log = (...args: any[]) => {
        stdoutLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };
      console.info = (...args: any[]) => {
        stdoutLogs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };
      console.warn = (...args: any[]) => {
        stdoutLogs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };
      console.error = (...args: any[]) => {
        stderrLogs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };

      // Wrap in AsyncFunction
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('require', code);
      
      const mockRequire = (moduleName: string) => {
        const file = files.find(f => f.name === moduleName || f.name === `${moduleName}.js`);
        if (file) {
          // evaluate required file in isolation
          const exports: any = {};
          const subFn = new Function('exports', 'module', file.content);
          const module = { exports };
          subFn(exports, module);
          return module.exports;
        }
        throw new Error(`Cannot find module '${moduleName}'`);
      };

      await fn(mockRequire);

      const endTime = performance.now();
      return {
        stdout: stdoutLogs.join('\n') || '[Code executed without console output]',
        stderr: stderrLogs.join('\n'),
        exitCode: stderrLogs.length > 0 ? 1 : 0,
        executionTimeMs: Math.round(endTime - startTime)
      };
    } catch (err: any) {
      const endTime = performance.now();
      return {
        stdout: stdoutLogs.join('\n'),
        stderr: (stderrLogs.join('\n') ? stderrLogs.join('\n') + '\n' : '') + `RuntimeError: ${err.message || err}`,
        exitCode: 1,
        executionTimeMs: Math.round(endTime - startTime),
        error: err.message
      };
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    }
  }
}
