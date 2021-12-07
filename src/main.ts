import { Board, Pin } from 'johnny-five';
import { open } from 'fs/promises';
import { isLeft } from 'fp-ts/Either';
import { run } from './Evaluator/run';
import { run as runParser } from 'parser-ts/code-frame';
import { parse } from './Parser/parse';
import { Cell, Stream, StreamSink } from 'sodiumjs';
import {
  createTuple, equals,
  isRunoCallable,
  isRunoCustomValue,
  RunoConstructor, RunoEvent,
  RunoExoticFunction, RunoObservable,
  RunoValue
} from './Evaluator/Value';
import { createError, isRunoError, RunoEvalResult } from './Evaluator/Runtime';
import BigNumber from 'bignumber.js';

const board = new Board();

function toPinNum(x: string): number {
  return Number(/[da](\d)/.exec(x)![1]);
}

board.on('ready', async () => {
  const sourceFile = await open(process.argv[2], 'r');
  const source = (await sourceFile.read()).buffer.toString('utf-8');
  const configFile = await open(process.argv[3], 'r');
  const configText = (await configFile.read()).buffer.toString().replaceAll('\u0000', '');
  const config: Record<string, string> = JSON.parse(configText);

  const ast = runParser(parse, source);

  const primitives: Record<string, RunoValue> = createPrimitives({
    HIGH: new RunoConstructor('HIGH', []),
    LOW: new RunoConstructor('LOW', []),
    sec: new StreamSink<RunoValue>(),
    mapTo: (streamOrCell, value) => {
      if (streamOrCell instanceof Stream || streamOrCell instanceof Cell) {
        return streamOrCell.map(() => value);
      } else return createError('streamorcell');
    },
    filter: (stream, pred) => {
      if (stream instanceof Stream && isRunoCallable(pred)) {
        return stream.filter(v => {
          const judge = pred.call([v]);

          if (isRunoError(judge)) return false;
          if (typeof judge === 'boolean') return judge;
          else return false;
        })
      } else return createError('terror');
    },
    map: (streamOrCell, f): RunoEvalResult => {
      if (streamOrCell instanceof Stream || streamOrCell instanceof Cell) {
        if (isRunoCallable(f)) {
          return streamOrCell.map(x => f.call([x])) as (RunoEvent | RunoObservable);
        } else return streamOrCell.map(() => f as RunoValue);
      } else return createError('streamorcell');
    },
    isHIGH: value => value === primitives.HIGH,
    eq: (x, y) => equals(x, y),
    add: (x, y) => {
      if (x instanceof BigNumber && y instanceof BigNumber) return x.plus(y);
      else return createError('numnum');
    },
    minus: (x, y) => {
      if (x instanceof BigNumber && y instanceof BigNumber) return x.minus(y);
      else return createError('numnum');
    },
    mult: (x, y) => {
      if (x instanceof BigNumber && y instanceof BigNumber) return x.multipliedBy(y);
      else return createError('numnum');
    },
    div: (x, y) => {
      if (x instanceof BigNumber && y instanceof BigNumber) return x.div(y);
      else return createError('numnum');
    },
    mod: (x, y) => {
      if (x instanceof BigNumber && y instanceof BigNumber) return x.mod(y);
      else return createError('numnum');
    },
    merge: (x, y, f) => {
      if (x instanceof Stream && y instanceof Stream && isRunoCallable(f)) return x.merge(y, (x1, y1) => f.call([x1, y1]) as RunoValue);
      else return createError('streamstreamfunc');
    },
    hold: (s, init) => {
      if (s instanceof Stream) {
        return s.hold(init);
      } else return createError('stream');
    },
    snapshot: (s, f, c) => {
      if (isRunoCallable(f) && s instanceof Stream && c instanceof Cell) {
        return s.snapshot(c, (s1, c1) => f.call([s1, c1]) as RunoValue);
      } else return createError('funcstreamcell');
    },
    fold: (s, f, init) => {
      if (isRunoCallable(f) && s instanceof Stream) {
        return s.accum(init, (acc, s1) => f.call([acc, s1]) as RunoValue);
      } else return createError('streamfunc');
    },
    True: true,
    False: false,
    snapshot1: (s, c) => {
      if (s instanceof Stream && c instanceof Cell) {
        return s.snapshot1(c);
      } else return createError('streamcell');
    },
    toText(v) {
      return v.toString();
    },
    concat: (s1, s2) => {
      if (typeof s1 === 'string' && typeof s2 === 'string') {
        return s1 + s2;
      } else return createError('strstr');
    }
  });
  const drivers = {
    console: (x: RunoValue) => {
      console.log(prettyPrint(x));
    }
  };

  for (const [pin, mode] of Object.entries(config)) {
    const pinInstance = new Pin(toPinNum(pin));

    if (mode === 'input') {
      primitives[pin] = new StreamSink<RunoValue>();

      pinInstance.on('high', () => {
        console.log('high');
        (primitives[pin] as StreamSink<RunoValue>).send(primitives.HIGH)
      });
      pinInstance.on('low', () => (primitives[pin] as StreamSink<RunoValue>).send(primitives.LOW));

      (primitives[pin] as StreamSink<RunoValue>).listen(() => {});

      board.pinMode(toPinNum(pin), 0);

      board.digitalRead(toPinNum(pin), value => (primitives[pin] as StreamSink<RunoValue>).send(value === 0 ? primitives.HIGH : primitives.LOW));

    } else {
      //@ts-ignore
      drivers[pin] = (x: RunoValue) => {
        if (!isRunoCustomValue(x)) return;

        if (x.tag === 'LOW') pinInstance.low();
        if (x.tag === 'HIGH') pinInstance.high();
      };

      board.pinMode(toPinNum(pin), 1);
    }
  }

  if (isLeft(ast)) {
    console.log(`Parsing fail: \n ${ast.left}`);
    process.exit(1);
  }
  else {
    run(primitives, drivers, ast.right, e => {
      console.log(e);
      process.exit(1);
    });

    (primitives.sec as StreamSink<RunoValue>).listen(() => {});

    board.loop(1000, () => {
      (primitives.sec as StreamSink<RunoValue>).send(createTuple({}));
    });

    console.log('RUNO READY');
  }
});

function createPrimitives(prims: Record<string, RunoValue | number | ((...args: RunoValue[]) => RunoEvalResult)>): Record<string, RunoValue> {
  let encoded: Record<string, RunoValue> = {};

  for (const [key, value] of Object.entries(prims)) {
    if (typeof value === 'function') {
      if (value.length < 1) throw new Error('variadic function and constant functions are not automatically transformed');

      encoded[key] = new RunoExoticFunction(value, value.length);
    } else if (typeof value === 'number') encoded[key] = new BigNumber(value);
    else encoded[key] = value;
  }

  return encoded;
}

function prettyPrint(x: RunoValue): string {
  if (x instanceof BigNumber) return x.toString(10);
  if (isRunoCustomValue(x)) {
    return `${x.tag} (${x.args.map(prettyPrint).join(',')})`;
  } else return x.toString();
}