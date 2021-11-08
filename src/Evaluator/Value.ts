import { Cell, Stream } from 'sodiumjs';

export type RunoNumber = number; //@TODO: use bigfloat module.
export type RunoText = string;
export type RunoBool = boolean;
export interface RunoTuple extends Record<string, RunoValue> {}
export class RunoFunction {}
export type RunoEvent = Stream<RunoValue>;
export type RunoObservable = Cell<RunoValue>;
export type RunoValue = RunoNumber | RunoText | RunoBool | RunoTuple | RunoFunction | RunoEvent | RunoObservable;