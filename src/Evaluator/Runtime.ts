import { isRunoCallable, isRunoCustomValue, isRunoTuple, RunoValue } from './Value';
import BigNumber from 'bignumber.js';
import { Cell, Stream } from 'sodiumjs';

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

export function resolveType(value: RunoValue): string {
  if (typeof value === 'string') return 'text';
  if (value instanceof BigNumber) return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (isRunoTuple(value)) return 'value';
  if (isRunoCallable(value)) return 'function';
  if (isRunoCustomValue(value)) return value.tag;
  if (value instanceof Cell) return 'cell';
  if (value instanceof Stream) return 'stream';
  else throw new Error('unreachable code');
}

export function createTypeError(value: RunoValue, expectedType: string, paramName?: string, funcName?: string) {
  if (paramName && funcName) {
    return createError(`value of type ${expectedType} expected as '${paramName}' of ${funcName}, but got value of type ${resolveType(value)}`)
  }
  else return createError(`value of type ${expectedType} expected, but got value of type ${resolveType(value)}`)
}

export type RunoEvalResult = RunoValue | RunoError;