import {
  between,
  bind,
  bindTo,
  chain,
  chainFirst,
  either,
  many,
  many1,
  map,
  optional,
  Parser,
  sepBy,
  sepBy1,
  surroundedBy
} from 'parser-ts/Parser';
import {
  RunoBind,
  RunoExpression,
  RunoFlow,
  RunoFunctionApplication,
  RunoIfThenElse,
  RunoLambda,
  RunoLiteral,
  RunoNumber,
  RunoPatternMatch,
  RunoPatternMatchCase,
  RunoProgram,
  RunoStatement,
  RunoTermDefinition,
  RunoText,
  RunoTuple,
  RunoTupleElement,
  RunoName,
  RunoReference
} from './AST';
import { constant, pipe } from 'fp-ts/function';
import { alphanum, Char, char, digit, lower, notOneOf, oneOf, upper } from 'parser-ts/char';
import { none } from 'fp-ts/Option';
import { spaces, string } from 'parser-ts/string';
import { Stream } from 'parser-ts/Stream';
import { ParseResult } from 'parser-ts/ParseResult';

const and: <I, A, B>(parser: Parser<I, B>) => (_: Parser<I, A>) => Parser<I, B> = parser => chain(constant(parser));
const andFirst: <I, A, B>(parser: Parser<I, B>) => (_: Parser<I, A>) => Parser<I, A> = parser => chainFirst(constant(parser));

const withTrim: <A>(parser: Parser<Char, A>) => Parser<Char, A> = parser => pipe(
  spaces,
  and(parser)
);

const alphabet: Parser<Char, Char> = either(
  lower,
  constant(upper)
);
const name: Parser<Char, RunoName> = pipe(
  alphabet,
  chain(head =>
      pipe(
        many(alphanum),
        map(chars => [head, ...chars].join(''))
      )
  ),
);
const reference: Parser<Char, RunoReference> = pipe(
  name,
  map(name => ({ type: 'RunoReference', name }))
);

const number: Parser<Char, RunoNumber> = pipe(
  either(
    pipe(
      oneOf('123456789'),
      chain(head =>
        pipe(
          many(digit),
          map(digits => [head, ...digits].join('')),
        )
      )
    ),
    constant(char('0'))
  ),
  map(RunoNumber)
);

const text: Parser<Char, RunoText> = pipe(
  surroundedBy(char('\''))(many(notOneOf('\''))), //@TODO: escaping.
  map(chars => chars.join('')),
  map(RunoText)
);

const tupleElement: Parser<Char, RunoTupleElement> = pipe(
  either(
    pipe(
      expression,
      map(expression => RunoTupleElement(none, expression)),
    ),
    constant(pipe(
      optional(name),
      bindTo('identifier'),
      andFirst(char('=')),
      bind('expression', constant(expression)),
      map(({ identifier: name, expression }) => RunoTupleElement(name, expression))
    ))
  )
);
const tuple: Parser<Char, RunoTuple>
  = pipe(
  between(char('('), char(')'))(sepBy(withTrim(char(',')), withTrim(tupleElement))),
  map(RunoTuple)
);

const lambda: Parser<Char, RunoLambda> = pipe(
  char('\\'),
  bind('parameters', constant(many1(withTrim(name)))),
  andFirst(withTrim(string('->'))),
  bind('expression', constant(withTrim(expression))),
  map(({ parameters, expression: body }) => RunoLambda(parameters, body))
);

const literal: Parser<Char, RunoLiteral> = either(
  number,
  constant(
    either(
      text,
      constant(
        either<Char, RunoLiteral>(
          tuple,
          constant(lambda)
        )
      )
    )
  )
);

const application: Parser<Char, RunoFunctionApplication> = pipe(
  nonCirculativeExpression,
  bindTo('head'),
  bind('args', constant(withTrim(sepBy1(spaces, nonCirculativeExpression)))),
  map(({ head, args }) => RunoFunctionApplication(head, args))
);

const constantCaseIdentifier: Parser<Char, RunoName> = pipe(
  upper,
  chain(head =>
    pipe(
      many(alphanum),
      map(chars => [head, ...chars].join(''))
    )
  ),
);
const patternMatchCase: Parser<Char, RunoPatternMatchCase> = pipe(
  constantCaseIdentifier,
  bindTo('name'),
  bind('parameters', constant(withTrim(sepBy(spaces, name)))),
  andFirst(withTrim(string('->'))),
  bind('body', constant(withTrim(expression))),
  map(({ name, parameters, body }) => RunoPatternMatchCase(name, parameters, body))
);
const patternMatch: Parser<Char, RunoPatternMatch> = pipe(
  string('match'),
  bind('target', constant(withTrim(expression))),
  bind('cases', constant(many(patternMatchCase))),
  map(({ target, cases }) => RunoPatternMatch(target, cases))
);

const ifThenElse: Parser<Char, RunoIfThenElse> = pipe(
  string('if'),
  bind('condition', constant(withTrim(expression))),
  andFirst(withTrim(string('then'))),
  bind('then', constant(withTrim(expression))),
  andFirst(withTrim(string('else'))),
  bind('else', constant(withTrim(expression))),
  map(({ condition, then, else: _ }) => RunoIfThenElse(condition, then, _)),
);

function expression(i: Stream<Char>): ParseResult<Char, RunoExpression> {
  const expression: Parser<Char, RunoExpression> = either(
    application,
    constant(
      either(
        patternMatch,
        constant(
          either(
            ifThenElse,
            constant(
              either<Char, RunoExpression>(
                literal,
                constant(reference)
              )
            )
          )
        )
      )
    )
  );

  return expression(i);
}
function nonCirculativeExpression(i: Stream<Char>): ParseResult<Char, RunoExpression> {
  const nonCirculativeExpression: Parser<Char, RunoExpression> = either(
    patternMatch,
    constant(
      either(
        ifThenElse,
        constant(
          either<Char, RunoExpression>(
            literal,
            constant(reference)
          )
        )
      )
    )
  );

  return nonCirculativeExpression(i);
}

const flow: Parser<Char, RunoFlow> = pipe(
  optional(reference),
  bindTo('source'),
  bind('operations', constant(withTrim(between(char('{'), withTrim(char('}')))(many(pipe(withTrim(application), andFirst(withTrim(char(';'))))))))),
  bind('destination', constant(optional(withTrim(reference)))),
  map(({ source, operations, destination }) => RunoFlow(source, operations, destination))
);

const binding: Parser<Char, RunoBind> = pipe(
  name,
  bindTo('identifier'),
  andFirst(withTrim(char(':'))),
  bind('object', constant(withTrim(either<Char, RunoExpression | RunoFlow>(expression, constant(flow))))),
  map(({ identifier, object }) => RunoBind(identifier, object))
);

const termDefinition: Parser<Char, RunoTermDefinition> = pipe(
  string('Term'),
  bind('name', constant(withTrim(constantCaseIdentifier))),
  bind('parameters', constant(sepBy(spaces, name))),
  map(({ name, parameters }) => RunoTermDefinition(name, parameters))
);

const statement: Parser<Char, RunoStatement> = either(
  binding,
  constant(
    either<Char, RunoStatement>(
      flow,
      constant(termDefinition)
    )
  )
);
export const parse: Parser<Char, RunoProgram> = many(withTrim(statement));

// every parser assume that it's forward spaces are removed
// \x -> \y -> x y (lambda is right-assoc)