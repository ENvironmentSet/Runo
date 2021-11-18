import {
  RunoIdentifier,
  RunoLambda as RunoLambdaAST, RunoLiteral,
  RunoNumber as RunoNumberAST,
  RunoText as RunoTextAST,
  RunoTuple as RunoTupleAST,
  RunoTupleElement as RunoTupleElementAST
} from '../Parser/AST';
import { Cell } from 'sodiumjs';
import { createTuple, RunoFunction, RunoNumber, RunoText, RunoTuple, RunoValue } from './Value';
import { BigNumber } from 'bignumber.js';
import { isSome, Option } from 'fp-ts/Option';
import { Environment$ } from './Environment';
import { expression } from './expression';

export function number({ code }: RunoNumberAST): Cell<RunoNumber> {
  return new Cell(new BigNumber(code));
}

export function text({ code }: RunoTextAST): Cell<RunoText> {
  return new Cell(code);
}

export function tupleElement(env$: Environment$, { name, expression: exp }: RunoTupleElementAST): Cell<{ name: Option<RunoIdentifier>, value: RunoValue }> {
  const value$ = expression(env$, exp);

  return value$.map(value => ({ name, value }));
}

export function tuple(env$: Environment$, { elements }: RunoTupleAST): Cell<RunoTuple> {
  const elements$ = Cell.liftArray(elements.map(ast => tupleElement(env$, ast)));

  return elements$.map(elements => {
    const tupleRep: Record<string, RunoValue> = {};

    for (const [i, element] of elements.entries()) {
      if (isSome(element.name)) tupleRep[element.name.value] = element.value;
      tupleRep[i] = element.value;
    }

    return createTuple(tupleRep);
  })
}

export function lambda(env$: Environment$, { parameters, body }: RunoLambdaAST): Cell<RunoFunction> {
  return new Cell(new RunoFunction(env$, parameters, body));
}

export function literal(env$: Environment$, ast: RunoLiteral): Cell<RunoValue> {
  if (ast.type === 'RunoNumber') return number(ast) as Cell<RunoValue>;
  if (ast.type === 'RunoText') return text(ast) as Cell<RunoValue>;
  if (ast.type === 'RunoTuple') return tuple(env$, ast) as Cell<RunoValue>;
  else return lambda(env$, ast) as Cell<RunoValue>;
}