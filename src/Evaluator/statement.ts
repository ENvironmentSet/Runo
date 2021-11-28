import { createError, isRunoError, RunoError, RunoEvalResult } from './Runtime';
import { Environment } from './Environment';
import { RunoBind, RunoFlow, RunoStatement, RunoTermDefinition } from '../Parser/AST';
import { RunoConstructor } from './Value';
import { evalExpression } from './expression';
import { isNone } from 'fp-ts/Option';
import { Cell, Stream } from 'sodiumjs';

export function evalBind(env: Environment, { identifier, object }: RunoBind): RunoError | void {
  if (object.type === 'RunoFlow') return createError('WIP1'); //@TODO
  else {
    const val = evalExpression(env, object);

    if (isRunoError(val)) return val;
    else env.createBinding(identifier, val);
  }
}

export function evalFlow(env: Environment, { source, destination, operations }: RunoFlow): RunoError | void {
  if (isNone(source) || isNone(destination)) return createError('WIP2'); //@TODO

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

  const r = env.createBinding(name, newConstructor);

  if (isRunoError(r)) return r;
}

export function evalStatement(env: Environment, ast: RunoStatement): RunoError | void {
  if (ast.type === 'RunoBind') return evalBind(env, ast);
  if (ast.type === 'RunoFlow') return evalFlow(env, ast);
  if (ast.type === 'RunoTermDefinition') return evalTermDefinition(env, ast);
}