import { Binding, Environment$, IdSelector, MetaPropertySelector, Selector } from './Environment';
import {
  RunoExpression as RunoExpressionAST,
  RunoFunctionApplication,
  RunoIfThenElse,
  RunoPatternMatch,
  RunoPatternMatchCase,
  RunoSelector as RunoSelectorAST,
  RunoSelectorKind
} from '../Parser/AST';
import { Cell } from 'sodiumjs';
import { isRunoCustomValue, isRunoTuple, RunoConstructor, RunoCustomValue, RunoFunction, RunoValue } from './Value';
import { zip } from 'fp-ts/Array';
import { literal } from './literals';
import { isNone, Some } from 'fp-ts/Option';

export function functionApplication(env$: Environment$, { head, arguments: args }: RunoFunctionApplication ): Cell<RunoValue> {
  const head$ = expression(env$, head);
  const args$ = Cell.liftArray(args.map(arg => expression(env$, arg)));

  return Cell.switchC(head$.map(head => {
    if (head instanceof RunoFunction) return Cell.switchC(args$.map(args => head.call(args)));
    if (head instanceof RunoConstructor) return Cell.switchC(args$.map(args => head.construct(args)));
    else return new Cell(head as RunoValue);
  }));
}

//@TODO: Tuple Pattern match support
//@TODO: non-exhaust pattern match handle

export function patternMatch(env$: Environment$, { target, cases }: RunoPatternMatch): Cell<RunoValue> {
  const targetValue$ = expression(env$, target);

  function matchCase(value: RunoCustomValue, { name, parameters }: RunoPatternMatchCase): boolean {
    if (value.tag !== name) return false;
    if (value.args.length !== parameters.length) return false;

    return true;
  }

  return Cell.switchC(targetValue$.map(value => {
    for (const c of cases) {
      if (!isRunoCustomValue(value)) {
        if (!isRunoTuple(value)) throw 'cannot match'; // //@FIXME: meaningless code, only for type check. runo need it's own error handling process.
        if (c.name === 'Tuple') { //@FIXME: Monkey patch
          const newBindings = zip(c.parameters, Object.values(value)).map(([key, value]) => [key, new Binding(value)]);
          const newEnv$ = Environment$.extend(env$, Object.fromEntries(newBindings));

          return expression(newEnv$, c.body);
        }
      }
      else if (matchCase(value, c)) {
        const newBindings = zip(c.parameters, value.args).map(([key, value]) => [key, new Binding(value)]);
        const newEnv$ = Environment$.extend(env$, Object.fromEntries(newBindings));

        return expression(newEnv$, c.body);
      }
    }

    throw 'non-exhaust';
  }));
}

export function ifThenElse(env$: Environment$, { condition, then, else: e }: RunoIfThenElse): Cell<RunoValue> {
  const condition$ = expression(env$, condition);

  return Cell.switchC(condition$.map(cond => {
    if (typeof cond !== 'boolean') throw 'boolean only';
    if (cond === true) return expression(env$, then);
    else return expression(env$, e);
  }));
}

function createSelector(env$: Environment$, ast: RunoSelectorAST): Cell<Selector> {
  if (ast.kind === RunoSelectorKind.ID) {
    if (isNone(ast.and)) return new Cell<Selector>(new IdSelector(ast.identifier));
    else return createSelector(env$, ast.and.value).map(next => new IdSelector(ast.identifier, next) as Selector);
  } else if (ast.kind === RunoSelectorKind.CLASS) {
    if (isNone(ast.and)) return new Cell<Selector>(new MetaPropertySelector('class', ast.identifier));
    else return createSelector(env$, ast.and.value).map(next => new MetaPropertySelector('class', ast.identifier, next) as Selector);
  } else if (ast.kind === RunoSelectorKind.ATTRIBUTE) {
    const value$ = expression(env$, ast.value);

    if (isNone(ast.and)) return value$.map(value => new MetaPropertySelector(ast.key, value) as Selector);
    else return Cell.switchC(value$.map(value => createSelector(env$, (ast.and as Some<RunoSelectorAST>).value).map(next => new MetaPropertySelector(ast.key, value, next) as Selector)));
  } throw 'no';
}

export function selector(env$: Environment$, ast: RunoSelectorAST): Cell<RunoValue[]> { //@TODO: Cell of List of Values -> Cell of Value
  return Cell.switchC(createSelector(env$, ast).map(selector => Environment$.select(env$, selector)));
}

export function expression(env$: Environment$, ast: RunoExpressionAST): Cell<RunoValue> {
  if (ast.type === 'RunoFunctionApplication') return functionApplication(env$, ast) as Cell<RunoValue>;
  if (ast.type === 'RunoPatternMatch') return patternMatch(env$, ast) as Cell<RunoValue>;
  if (ast.type === 'RunoIfThenElse') return ifThenElse(env$, ast) as Cell<RunoValue>;
  if (ast.type === 'RunoSelector') return selector(env$, ast).map(values => values[0]); //@TODO: handle multiple values, flat.
  else return literal(env$, ast);
}