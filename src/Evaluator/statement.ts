import { isRunoError, RunoError, RunoEvalResult } from './Runtime';
import { Environment } from './Environment';
import { RunoBind, RunoFlow, RunoStatement, RunoTermDefinition } from '../Parser/AST';
import { RunoConstructor, RunoExoticFunction } from './Value';
import { evalExpression } from './expression';
import { isNone, isSome } from 'fp-ts/Option';
import { Cell, Stream } from 'sodiumjs';

export function evalBind(env: Environment, { identifier, object }: RunoBind): RunoError | void {
  if (object.type === 'RunoFlow') {
    if (isNone(object.source)) {
      if (isSome(object.destination)) {
        const driver = env.resolveDriver(object.destination.value);

        if (!(driver instanceof Function)) return driver;

        return env.createDriver(identifier, value => {
          const result = object.operations.reduce<RunoEvalResult>((prev, op) => {
            if (isRunoError(prev)) return prev;

            const tempEnv = new Environment({ '0temp': prev }, env);

            return evalExpression(tempEnv, {...op, arguments: [{ type: 'RunoReference', name: '0temp' }, ...op.arguments]});
          }, value);

          if (result instanceof Cell || result instanceof Stream) result.listen(v => { if (!isRunoError(v)) driver(v); });
        })
      } else {
        return env.createBinding(identifier, new RunoExoticFunction(value => {
          return object.operations.reduce<RunoEvalResult>((prev, op) => {
            if (isRunoError(prev)) return prev;

            const tempEnv = new Environment({ '0temp': prev }, env);

            return evalExpression(tempEnv, {...op, arguments: [{ type: 'RunoReference', name: '0temp' }, ...op.arguments]});
          }, value);
        }, 1));
      }
    } else {

      const src = evalExpression(env, object.source.value);

      const result = object.operations.reduce<RunoEvalResult>((prev, op) => {
        if (isRunoError(prev)) return prev;

        const tempEnv = new Environment({ '0temp': prev }, env);

        return evalExpression(tempEnv, {...op, arguments: [{ type: 'RunoReference', name: '0temp' }, ...op.arguments]});
      }, src);

      if (isRunoError(result)) return result;

      if (isSome(object.destination)) {
        const driver = env.resolveDriver(object.destination.value);

        if (!(driver instanceof Function)) return driver;

        if (result instanceof Cell || result instanceof Stream) result.listen(v => { if (!isRunoError(v)) driver(v); });
      }

      return env.createBinding(identifier, result);
    }
  }
  else {
    const val = evalExpression(env, object);

    if (isRunoError(val)) return val;
    else env.createBinding(identifier, val);
  }
}

export function evalFlow(env: Environment, { source, destination, operations }: RunoFlow): RunoError | void {
  if (isNone(source) || isNone(destination)) return;

  const src = evalExpression(env, source.value);
  const driver = env.resolveDriver(destination.value);

  if (isRunoError(src)) return src;
  if (!(driver instanceof Function)) return driver;

  const result = operations.reduce<RunoEvalResult>((prev, op) => {
    if (isRunoError(prev)) return prev;

    const tempEnv = new Environment({ '0temp': prev }, env);

    return evalExpression(tempEnv, {...op, arguments: [{ type: 'RunoReference', name: '0temp' }, ...op.arguments]});
  }, src);

  if (result instanceof Cell || result instanceof Stream) result.listen(v => { if (!isRunoError(v)) driver(v); });
  if (isRunoError(result)) return result;
}

export function evalTermDefinition(env: Environment, { name, parameters }: RunoTermDefinition): RunoError | void {
  const newConstructor = new RunoConstructor(name, parameters);

  return env.createBinding(name, newConstructor);
}

export function evalStatement(env: Environment, ast: RunoStatement): RunoError | void {
  if (ast.type === 'RunoBind') return evalBind(env, ast);
  if (ast.type === 'RunoFlow') return evalFlow(env, ast);
  if (ast.type === 'RunoTermDefinition') return evalTermDefinition(env, ast);
}