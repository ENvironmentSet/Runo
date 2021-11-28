import { Environment } from './Environment';
import {
  RunoExpression,
  RunoFunctionApplication,
  RunoIfThenElse,
  RunoPatternMatch,
  RunoReference
} from '../Parser/AST';
import { composeError, createError, isRunoError, RunoEvalResult } from './Runtime';
import { equals, isRunoCallable, isRunoCustomValue, RunoValue } from './Value';
import { evalLiteral } from './literals';

export function evalFunctionApplication(env: Environment, { head, arguments: args }: RunoFunctionApplication): RunoEvalResult {
  const headVal = evalExpression(env, head);
  const argVals = args.map(arg => evalExpression(env, arg));

  if (isRunoError(headVal)) return headVal;
  if (argVals.some(isRunoError)) return argVals.filter(isRunoError).reduce(composeError);
  if (isRunoCallable(headVal)) return headVal.call(argVals as RunoValue[]);
  else return headVal;
}

export function evalPatternMatch(env: Environment, { target, cases }: RunoPatternMatch): RunoEvalResult {
  const targetVal = evalExpression(env, target);

  if (isRunoError(targetVal)) return targetVal;
  if (!isRunoCustomValue(targetVal)) return createError(`${targetVal} is not matchable`);

  for (const { name, parameters, body } of cases) {
    if (targetVal.tag === name) {
      const newEnv = new Environment(Object.fromEntries(parameters.map((param, i) => [param, targetVal.args[i]])), env);

      return evalExpression(newEnv, body);
    }
  }

  return createError('non-exhaust pattern match, non was matched');
}

export function evalIfThenElse(env: Environment, { condition, then, else: else_ }: RunoIfThenElse): RunoEvalResult {
  const condVal = evalExpression(env, condition);

  if (isRunoError(condVal)) return condVal;
  if (equals(condVal, true)) return evalExpression(env, then);
  else return evalExpression(env, else_);
}

export function evalReference(env: Environment, { name }: RunoReference) {
  return env.resolve(name);
}

export function evalExpression(env: Environment, ast: RunoExpression): RunoEvalResult {
  if (ast.type === 'RunoFunctionApplication') return evalFunctionApplication(env, ast);
  if (ast.type === 'RunoReference') return evalReference(env, ast);
  if (ast.type === 'RunoPatternMatch') return evalPatternMatch(env, ast);
  if (ast.type === 'RunoIfThenElse') return evalIfThenElse(env, ast);
  else return evalLiteral(env, ast);
}