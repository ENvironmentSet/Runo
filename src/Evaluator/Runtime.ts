import { RunoValue } from './Value';

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
export function composeError(x: RunoError, y: RunoError): RunoError {
  return createError(`${x.message} \n ${y.message}`);
}

export type RunoEvalResult = RunoValue | RunoError;