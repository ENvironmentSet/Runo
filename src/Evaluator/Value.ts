import { Cell, Stream } from 'sodiumjs';
import { BigNumber } from 'bignumber.js';
import { Environment$ } from './Environment';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { RunoExpression, RunoIdentifier } from '../Parser/AST';

const RunoTupleTag: unique symbol = Symbol('@RunoTupleTag');

export type RunoNumber = BigNumber;
export type RunoText = string;
export type RunoBool = boolean;
export interface RunoTuple extends Record<string, RunoValue> {
  [RunoTupleTag]: typeof RunoTupleTag
}
export class RunoFunction {
  env$: Environment$;
  parameters: NonEmptyArray<RunoIdentifier>;
  body: RunoExpression;


  constructor(env$: Environment$, parameters: NonEmptyArray<RunoIdentifier>, body: RunoExpression) {
    this.env$ = env$;
    this.parameters = parameters;
    this.body = body;
  }

  call(arguments: RunoValue[]): Cell<RunoValue> {}
}
export type RunoEvent = Stream<RunoValue>;
export type RunoObservable = Cell<RunoValue>;
export type RunoValue = RunoNumber | RunoText | RunoBool | RunoTuple | RunoFunction | RunoEvent | RunoObservable;

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

export function equals(x: RunoValue, y: RunoValue): boolean {
  if (x instanceof BigNumber && y instanceof BigNumber) return x.isEqualTo(y);
  if (typeof x === 'string' && typeof y === 'string') return x === y;
  if (typeof x === 'boolean' && typeof y === 'boolean') return x === y;
  if (x instanceof Stream && y instanceof Stream) return x === y;
  if (x instanceof Cell && y instanceof Cell) return x === y;
  if (x instanceof RunoFunction && y instanceof RunoFunction) return x === y;
  if (isRunoTuple(x) && isRunoTuple(y))
    return Object.entries(x).every(([key, value]) => Reflect.has(y, key) && equals(value, y[key])) &&
      Object.entries(y).every(([key, value]) => Reflect.has(x, key) && equals(value, x[key]));
  return false;
}