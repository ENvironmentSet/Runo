import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { RunoValue } from './Value';
import { Environment } from './Environment';

const RunoErrorTag: unique symbol = Symbol('@RunoErrorTag');
export type RunoError = { [RunoErrorTag]: typeof RunoErrorTag, message?: string; }
export function createError(message: string): RunoError {
  return {
    [RunoErrorTag]: RunoErrorTag,
    message
  };
}
export function isRunoError(x: RunoValue | RunoError): x is RunoError {
  return typeof x === 'object' && Reflect.has(x, RunoErrorTag);
}

export type RunoEvalResult = NonEmptyArray<RunoValue | RunoError>;

export type RunoRuntime = (env: Environment) => RunoEvalResult;

export function pure(x: RunoValue): RunoRuntime {
  return () => [x];
}

export function error(message: string): RunoRuntime {
  return () => [createError(message)];
}

export function map(f: (x: RunoValue) => RunoValue): (runtime: RunoRuntime) => RunoRuntime {
  return runtime => env => {
    const prev = runtime(env);

    if (prev.some(isRunoError)) return prev.filter(isRunoError) as RunoEvalResult;
    else return prev.map(f) as RunoEvalResult;
  }
}

export function map2(f: (x: RunoValue) => RunoRuntime): (runtime: RunoRuntime) => RunoRuntime {
  return runtime => env => {
    const prev = runtime(env);

    if (prev.some(isRunoError)) return prev.filter(isRunoError) as RunoEvalResult;
    else return prev.map(v => f(v)(env)).flat(1) as RunoEvalResult;
  }
}