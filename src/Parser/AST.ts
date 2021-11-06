//@TODO: Use template literal type.

import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { Option } from 'fp-ts/Option';

export type RunoIdentifier = string;

export type RunoNumber = string;
export type RunoText = string;
export type RunoTupleElement = { name: Option<RunoIdentifier>, expression: RunoExpression };
export type RunoTuple = RunoTupleElement[];
export type RunoLambda = { parameters: NonEmptyArray<RunoIdentifier>, body: RunoExpression };
export type RunoLiteral = RunoNumber | RunoText | RunoTuple | RunoLambda;

export type RunoFunctionApplication = { head: RunoExpression, arguments: NonEmptyArray<RunoExpression> };
export type RunoPatternMatchCase = { name: RunoIdentifier, parameters: RunoIdentifier[], body: RunoExpression }; //@TODO: Deep pattern match
export type RunoPatternMatch = { target: RunoExpression, cases: RunoPatternMatchCase[] };
export type RunoIfThenElse = { condition: RunoExpression, then: RunoExpression, else: RunoExpression };
export type RunoExpression = RunoLiteral | RunoSelector | RunoFunctionApplication | RunoPatternMatch | RunoIfThenElse;

export enum RunoSelectorKind {
  ID,
  CLASS,
  ATTRIBUTE
}
export type RunoSelector
  = { kind: RunoSelectorKind.ID | RunoSelectorKind.CLASS, identifier: RunoIdentifier, and: Option<RunoSelector> }
  | { kind: RunoSelectorKind.ATTRIBUTE, key: RunoIdentifier, value: RunoExpression, and: Option<RunoSelector> };

export type RunoBind = { identifier: RunoIdentifier, object: RunoExpression | RunoFlow };
export type RunoFlow = { source: Option<RunoSelector>, operations: RunoFunctionApplication[], destination: Option<RunoSelector> }
export type RunoTermDefinition = { name: RunoIdentifier, parameters: RunoIdentifier[] };

export type RunoStatement = RunoBind | RunoFlow | RunoTermDefinition;
export type RunoProgram = RunoStatement[];