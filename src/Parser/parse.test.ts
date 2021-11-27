import { run } from 'parser-ts/code-frame';
import { parse } from './parse';
import { isRight } from 'fp-ts/Either';

describe('Tests for Parser', () => {
  test('T1', () => {
    const sampleSource: string = `
      d9 { map 'Hello, World!'; } serialDevice

      d9 {
        filter isLow; map HIGH;
      } d1
    `;

    const parseResult = run(parse, sampleSource);

    //@ts-ignore
    console.log(JSON.stringify(parseResult.right));

    expect(isRight(parseResult)).toBeTruthy();
  });
});