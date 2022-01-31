import { Cell, Stream } from 'sodiumjs';
import { BigNumber } from 'bignumber.js';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { RunoExpression, RunoName } from '../Parser/AST';
import { Environment } from './Environment';
import { isRunoError, RunoEvalResult } from './Runtime';
import { evalExpression } from './expression';

export type RunoNumber = BigNumber;

export type RunoText = string;

export type RunoBool = boolean;

const RunoTupleTag: unique symbol = Symbol('@RunoTupleTag');
export interface RunoTuple extends Record<string, RunoValue> {
  [RunoTupleTag]: typeof RunoTupleTag
}
export function createTuple(values: Record<string, RunoValue>): RunoTuple {
  const newTuple = {
    ...values
  };

  Object.defineProperty(newTuple, RunoTupleTag, { value: RunoTupleTag, enumerable: false });

  return newTuple as RunoTuple;
}
export function isRunoTuple(x: RunoValue): x is RunoTuple {
  return typeof x === 'object' && Reflect.has(x, RunoTupleTag);
}

export class RunoFunction {
  env: Environment;
  parameters: NonEmptyArray<RunoName>;
  body: RunoExpression;
  curriedArgs: RunoValue[];

  constructor(env: Environment, parameters: NonEmptyArray<RunoName>, body: RunoExpression, curriedArgs: RunoValue[] = []) {
    this.env = env;
    this.parameters = parameters;
    this.body = body;
    this.curriedArgs = curriedArgs;
  }

  call(args: RunoValue[]): RunoEvalResult {
    const composedArgs = this.curriedArgs.concat(args);

    if (composedArgs.length < this.parameters.length) return new RunoFunction(this.env, this.parameters, this.body, composedArgs);
    else if (composedArgs.length > this.parameters.length) {
      const left = composedArgs.slice(this.parameters.length);
      const matched: [string, RunoValue][] = this.parameters.map((name, i) => [name, composedArgs[i]]);
      const newEnv = new Environment(Object.fromEntries(matched), this.env);
      const result = evalExpression(newEnv, this.body);

      if (!isRunoError(result) && isRunoCallable(result)) return result.call(left);
      else return result;
    } else {
      const matched: [string, RunoValue][] = this.parameters.map((name, i) => [name, composedArgs[i]]);
      const newEnv = new Environment(Object.fromEntries(matched), this.env);

      return evalExpression(newEnv, this.body);
    }
  }
}

export class RunoExoticFunction {
  callback: (...x: RunoValue[]) => RunoEvalResult;
  length: number;
  curriedArgs: RunoValue[];

  constructor(callback: (...x: RunoValue[]) => RunoEvalResult, length: number, curriedArgs: RunoValue[] = []) {
    this.callback = callback;
    this.length = length;
    this.curriedArgs = curriedArgs;
  }

  call(args: RunoValue[]): RunoEvalResult {
    const composedArgs = this.curriedArgs.concat(args);

    if (composedArgs.length < this.length) return new RunoExoticFunction(this.callback, this.length, composedArgs);
    else if (composedArgs.length > this.length) {
      const left = composedArgs.slice(this.length);
      const result = this.callback(...composedArgs);

      if (isRunoError(result) || !isRunoCallable(result)) return result;

      return result.call(left);
    }
    else return this.callback(...composedArgs);
  }
}

const RunoCustomValueTag: unique symbol = Symbol('@RunoCustomValueTag');
export type RunoCustomValue = { [RunoCustomValueTag]: typeof RunoCustomValueTag, tag: string, args: RunoValue[] };
export class RunoConstructor {
  tag: string;
  parameters: RunoName[];
  curriedArgs: RunoValue[];

  constructor(tag: string, parameters: RunoName[], curriedArgs: RunoValue[] = []) {
    this.tag = tag;
    this.parameters = parameters;
    this.curriedArgs = curriedArgs;
  }

  call(args: RunoValue[]): RunoEvalResult {
    const composedArgs = this.curriedArgs.concat(args);

    if (composedArgs.length < this.parameters.length) return new RunoConstructor(this.tag, this.parameters, composedArgs);

    return {
      [RunoCustomValueTag]: RunoCustomValueTag,
      tag: this.tag,
      args: composedArgs
    };
  }
}
export function isRunoCustomValue(x: RunoValue): x is RunoCustomValue {
  return typeof x === 'object' && Reflect.has(x, RunoCustomValueTag);
}
export function createCustomValue(tag: string, args: RunoValue[]): RunoCustomValue {
  return {
    [RunoCustomValueTag]: RunoCustomValueTag,
    tag,
    args
  };
}

export function isRunoCallable(x: RunoValue): x is RunoFunction | RunoConstructor | RunoExoticFunction {
  return x instanceof RunoFunction || x instanceof RunoExoticFunction || x instanceof RunoConstructor;
}

export type RunoEvent = Stream<RunoValue>;

export type RunoObservable = Cell<RunoValue>;

export type RunoValue = RunoNumber | RunoText | RunoBool | RunoTuple | RunoFunction | RunoConstructor
                        | RunoEvent | RunoObservable | RunoCustomValue | RunoExoticFunction;

export function equals(x: RunoValue, y: RunoValue): boolean {
  if (x instanceof BigNumber && y instanceof BigNumber) return x.isEqualTo(y);
  if (typeof x === 'string' && typeof y === 'string') return x === y;
  if (typeof x === 'boolean' && typeof y === 'boolean') return x === y;
  if (isRunoTuple(x) && isRunoTuple(y))
    return Object.entries(x).every(([key, value]) => Reflect.has(y, key) && equals(value, y[key])) &&
      Object.entries(y).every(([key, value]) => Reflect.has(x, key) && equals(value, x[key]));
  if (isRunoCustomValue(x) && isRunoCustomValue(y)) return x.tag === y.tag && x.args.every((arg, i) => y.args[i] && equals(arg, y.args[i]));
  return false;
}