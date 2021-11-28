import { RunoValue } from './Value';
import { RunoError } from './Runtime';
import { RunoProgram } from '../Parser/AST';
import { Environment } from './Environment';
import { evalStatement } from './statement';

export function run(prims: Record<string, RunoValue>, drivers: Record<string, (x: RunoValue) => void>, statements: RunoProgram): RunoError | void {
  const toplevelEnv = new Environment(prims, undefined, drivers);

  for (const statement of statements) {
    const evalResult = evalStatement(toplevelEnv, statement);

    if (evalResult) return evalResult;
  }
}