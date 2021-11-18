//@TODO: Use template literal type.

import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { Option } from 'fp-ts/Option';

export type RunoIdentifier = string;

export type RunoNumber = { type: 'RunoNumber', code: string };
export function RunoNumber(code: string): RunoNumber {
  return { type: 'RunoNumber', code };
}
export type RunoText = { type: 'RunoText', code: string };
export function RunoText(code: string): RunoText {
  return { type: 'RunoText', code };
}
export type RunoTupleElement = { type: 'RunoTupleElement', name: Option<RunoIdentifier>, expression: RunoExpression };
export function RunoTupleElement(name: Option<RunoIdentifier>, expression: RunoExpression): RunoTupleElement {
  return { type: 'RunoTupleElement', name, expression };
}
export type RunoTuple = { type: 'RunoTuple', elements: RunoTupleElement[] };
export function RunoTuple(elements: RunoTupleElement[]): RunoTuple {
  return { type: 'RunoTuple', elements };
}
export type RunoLambda = { type: 'RunoLambda', parameters: NonEmptyArray<RunoIdentifier>, body: RunoExpression };
export function RunoLambda(parameters: NonEmptyArray<RunoIdentifier>, body: RunoExpression): RunoLambda {
  return { type: 'RunoLambda', parameters, body };
}
export type RunoLiteral = RunoNumber | RunoText | RunoTuple | RunoLambda;

export type RunoFunctionApplication = { type: 'RunoFunctionApplication', head: RunoExpression, arguments: NonEmptyArray<RunoExpression> };
export function RunoFunctionApplication(head: RunoExpression, args: NonEmptyArray<RunoExpression>): RunoFunctionApplication {
  return { type: 'RunoFunctionApplication', head, arguments: args };
}
export type RunoPatternMatchCase = { type: 'RunoPatternMatchCase', name: RunoIdentifier, parameters: RunoIdentifier[], body: RunoExpression }; //@TODO: Deep pattern match
export function RunoPatternMatchCase(name: RunoIdentifier, parameters: RunoIdentifier[], body: RunoExpression): RunoPatternMatchCase {
  return { type: 'RunoPatternMatchCase', name, parameters, body };
}
export type RunoPatternMatch = { type: 'RunoPatternMatch', target: RunoExpression, cases: RunoPatternMatchCase[] };
export function RunoPatternMatch(target: RunoExpression, cases: RunoPatternMatchCase[]): RunoPatternMatch {
  return { type: 'RunoPatternMatch', target, cases };
}
export type RunoIfThenElse = { type: 'RunoIfThenElse', condition: RunoExpression, then: RunoExpression, else: RunoExpression };
export function RunoIfThenElse(condition: RunoExpression, then: RunoExpression, else_: RunoExpression): RunoIfThenElse {
  return { type: 'RunoIfThenElse', condition, then, else: else_ };
}
export type RunoExpression = RunoLiteral | RunoSelector | RunoFunctionApplication | RunoPatternMatch | RunoIfThenElse;

export enum RunoSelectorKind {
  ID,
  CLASS,
  ATTRIBUTE
}
export type RunoSelector
  = { type: 'RunoSelector', kind: RunoSelectorKind.ID | RunoSelectorKind.CLASS, identifier: RunoIdentifier, and: Option<RunoSelector> }
  | { type: 'RunoSelector', kind: RunoSelectorKind.ATTRIBUTE, key: RunoIdentifier, value: RunoExpression, and: Option<RunoSelector> };
export function RunoSelector(kind: RunoSelectorKind.ID | RunoSelectorKind.CLASS, identifier: RunoIdentifier, and: Option<RunoSelector>): RunoSelector;
export function RunoSelector(kind: RunoSelectorKind.ATTRIBUTE, key: RunoIdentifier, value: RunoExpression, and: Option<RunoSelector>): RunoSelector;
export function RunoSelector(kind: RunoSelectorKind, x: RunoIdentifier, y: any, z?: any): RunoSelector {
  if (kind === RunoSelectorKind.ATTRIBUTE) return { type: 'RunoSelector', kind, key: x, value: y, and: z };
  else return { type: 'RunoSelector', kind, identifier: x, and: y };
}

export type RunoBind = { type: 'RunoBind', identifier: RunoIdentifier, object: RunoExpression | RunoFlow };
export function RunoBind(identifier: RunoIdentifier, object: RunoExpression | RunoFlow): RunoBind {
  return { type: 'RunoBind', identifier, object };
}
export type RunoFlow = { type: 'RunoFlow', source: Option<RunoSelector>, operations: RunoFunctionApplication[], destination: Option<RunoSelector> }
export function RunoFlow(source: Option<RunoSelector>, operations: RunoFunctionApplication[], destination: Option<RunoSelector>): RunoFlow {
  return { type: 'RunoFlow', source, operations, destination };
}
export type RunoTermDefinition = { type: 'RunoTermDefinition', name: RunoIdentifier, parameters: RunoIdentifier[] };
export function RunoTermDefinition(name: RunoIdentifier, parameters: RunoIdentifier[]): RunoTermDefinition {
  return { type: 'RunoTermDefinition', name, parameters };
}

export type RunoStatement = RunoBind | RunoFlow | RunoTermDefinition;
export type RunoProgram = RunoStatement[];