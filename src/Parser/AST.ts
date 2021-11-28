//@TODO: Use template literal type.

import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { Option } from 'fp-ts/Option';

export type RunoName = string;
export type RunoReference = { type: 'RunoReference', name: RunoName };

export type RunoNumber = { type: 'RunoNumber', code: string };
export function RunoNumber(code: string): RunoNumber {
  return { type: 'RunoNumber', code };
}
export type RunoText = { type: 'RunoText', code: string };
export function RunoText(code: string): RunoText {
  return { type: 'RunoText', code };
}
export type RunoTupleElement = { type: 'RunoTupleElement', name: Option<RunoName>, expression: RunoExpression };
export function RunoTupleElement(name: Option<RunoName>, expression: RunoExpression): RunoTupleElement {
  return { type: 'RunoTupleElement', name, expression };
}
export type RunoTuple = { type: 'RunoTuple', elements: RunoTupleElement[] };
export function RunoTuple(elements: RunoTupleElement[]): RunoTuple {
  return { type: 'RunoTuple', elements };
}
export type RunoLambda = { type: 'RunoLambda', parameters: NonEmptyArray<RunoName>, body: RunoExpression };
export function RunoLambda(parameters: NonEmptyArray<RunoName>, body: RunoExpression): RunoLambda {
  return { type: 'RunoLambda', parameters, body };
}
export type RunoLiteral = RunoNumber | RunoText | RunoTuple | RunoLambda;

export type RunoFunctionApplication = { type: 'RunoFunctionApplication', head: RunoExpression, arguments: NonEmptyArray<RunoExpression> };
export function RunoFunctionApplication(head: RunoExpression, args: NonEmptyArray<RunoExpression>): RunoFunctionApplication {
  return { type: 'RunoFunctionApplication', head, arguments: args };
}
export type RunoPatternMatchCase = { type: 'RunoPatternMatchCase', name: RunoName, parameters: RunoName[], body: RunoExpression }; //@TODO: Deep pattern match
export function RunoPatternMatchCase(name: RunoName, parameters: RunoName[], body: RunoExpression): RunoPatternMatchCase {
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
export type RunoExpression = RunoLiteral | RunoReference | RunoFunctionApplication | RunoPatternMatch | RunoIfThenElse;

export type RunoBind = { type: 'RunoBind', identifier: RunoName, object: RunoExpression | RunoFlow };
export function RunoBind(identifier: RunoName, object: RunoExpression | RunoFlow): RunoBind {
  return { type: 'RunoBind', identifier, object };
}
export type RunoFlow = { type: 'RunoFlow', source: Option<RunoReference>, operations: RunoFunctionApplication[], destination: Option<RunoName> }
export function RunoFlow(source: Option<RunoReference>, operations: RunoFunctionApplication[], destination: Option<RunoName>): RunoFlow {
  return { type: 'RunoFlow', source, operations, destination };
}
export type RunoTermDefinition = { type: 'RunoTermDefinition', name: RunoName, parameters: RunoName[] };
export function RunoTermDefinition(name: RunoName, parameters: RunoName[]): RunoTermDefinition {
  return { type: 'RunoTermDefinition', name, parameters };
}

export type RunoStatement = RunoBind | RunoFlow | RunoTermDefinition;
export type RunoProgram = RunoStatement[];