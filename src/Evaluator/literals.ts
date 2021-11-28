import { RunoLambda, RunoLiteral, RunoNumber, RunoText, RunoTuple } from '../Parser/AST';
import { createTuple, RunoFunction, RunoValue } from './Value';
import BigNumber from 'bignumber.js';
import { createError, isRunoError, RunoEvalResult } from './Runtime';
import { Environment } from './Environment';
import { isSome } from 'fp-ts/Option';
import { evalExpression } from './expression';

export function evalNumber({ code }: RunoNumber): RunoEvalResult {
  return new BigNumber(code);
}

export function evalText({ code }: RunoText): RunoEvalResult {
  return code;
}

export function evalTuple(env: Environment, { elements }: RunoTuple): RunoEvalResult {
  let entries: [string, RunoValue][] = [];

  for (const { name, expression } of elements) {
    const value = evalExpression(env, expression);

    if (isRunoError(value)) return value;
    if (isSome(name)) entries.push([name.value, value]);
    entries.push([String(entries.length), value]);
  }

  return createTuple(Object.fromEntries(entries));
}

export function evalLambda(env: Environment, { parameters, body }: RunoLambda): RunoEvalResult {
  return new RunoFunction(env, parameters, body);
}

export function evalLiteral(env: Environment, ast: RunoLiteral): RunoEvalResult {
  if (ast.type === 'RunoNumber') return evalNumber(ast);
  if (ast.type === 'RunoText') return evalText(ast);
  if (ast.type === 'RunoTuple') return evalTuple(env, ast);
  if (ast.type === 'RunoLambda') return evalLambda(env, ast);
  else return createError(`${ast} is not a literal`);
}