import { Cell, Stream } from 'sodiumjs';
import { BigNumber } from 'bignumber.js';
import { Binding, Environment$ } from './Environment';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { RunoExpression, RunoIdentifier } from '../Parser/AST';
import { zip } from 'fp-ts/Array';
import { expression } from './expression';

const RunoTupleTag: unique symbol = Symbol('@RunoTupleTag');

export type RunoNumber = BigNumber;
export type RunoText = string;
export type RunoBool = boolean;
export interface RunoTuple extends Record<string, RunoValue> {
  [RunoTupleTag]: typeof RunoTupleTag
}
export class RunoFunction {
  env$: Environment$;
  parameters: NonEmptyArray<string>;
  body: RunoExpression;
  curriedArgs: RunoValue[];

  constructor(env$: Environment$, parameters: NonEmptyArray<RunoIdentifier>, body: RunoExpression, curriedArgs: RunoValue[] = []) {
    this.env$ = env$;
    this.parameters = parameters;
    this.body = body;
    this.curriedArgs = curriedArgs;
  }

  call(args: RunoValue[]): Cell<RunoValue> {
    const composedArgs = [...this.curriedArgs, ...args];

    if (composedArgs.length >= this.parameters.length) {
      const params = zip(this.parameters, composedArgs).map(([key, value]) => [key, new Binding(value)]);
      const newEnv$ = Environment$.extend(this.env$, Object.fromEntries(params));

      return expression(newEnv$, this.body);
    } else return new Cell<RunoValue>(new RunoFunction(this.env$, this.parameters, this.body, composedArgs));
  }
}
export type RunoCustomValue = { tag: string, args: RunoValue[] };
export class RunoConstructor {
  tag: string;
  paramCount: number;
  curriedArgs: RunoValue[];

  constructor(tag: string, paramCount: number, curriedArgs: RunoValue[] = []) {
    this.tag = tag;
    this.paramCount = paramCount;
    this.curriedArgs = curriedArgs;
  }

  construct(args: RunoValue[]): Cell<RunoValue> {
    const composedArgs = [...this.curriedArgs, ...args];

    if (args.length >= this.paramCount) return new Cell<RunoValue>({ tag: this.tag, args: composedArgs });
    else return new Cell<RunoValue>(new RunoConstructor(this.tag, this.paramCount, composedArgs));
  }
}
export type RunoEvent = Stream<RunoValue>;
export type RunoObservable = Cell<RunoValue>;
export type RunoValue = RunoNumber | RunoText | RunoBool | RunoTuple | RunoFunction | RunoEvent | RunoObservable | RunoConstructor | RunoCustomValue;

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

export function isRunoCustomValue(x: RunoValue): x is RunoCustomValue {
  return typeof x === 'object' && Reflect.has(x, 'tag');
}

export function equals(x: RunoValue, y: RunoValue): boolean {
  if (x instanceof BigNumber && y instanceof BigNumber) return x.isEqualTo(y);
  if (typeof x === 'string' && typeof y === 'string') return x === y;
  if (typeof x === 'boolean' && typeof y === 'boolean') return x === y;
  if (x instanceof Stream && y instanceof Stream) return x === y;
  if (x instanceof Cell && y instanceof Cell) return x === y;
  if (x instanceof RunoFunction && y instanceof RunoFunction) return x === y; //@TODO Fixme with curried args.
  if (isRunoTuple(x) && isRunoTuple(y))
    return Object.entries(x).every(([key, value]) => Reflect.has(y, key) && equals(value, y[key])) &&
      Object.entries(y).every(([key, value]) => Reflect.has(x, key) && equals(value, x[key]));
  if (x instanceof RunoConstructor && y instanceof RunoConstructor)
    return x.tag === y.tag && x.paramCount === y.paramCount && x.curriedArgs.every((arg, i) => y.curriedArgs[i] && equals(arg, y.curriedArgs[i]));
  if (isRunoCustomValue(x) && isRunoCustomValue(y)) return x.tag === y.tag && x.args.every((arg, i) => y.args[i] && equals(arg, y.args[i])); // or just give false?
  return false;
}