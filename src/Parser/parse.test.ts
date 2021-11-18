import { run } from 'parser-ts/code-frame';
import { parse } from './parse';
import { isRight } from 'fp-ts/Either';

describe('Tests for Parser', () => {
  test('T1', () => {
    const sampleSource: string = `
      pin[digital=true] { map 'Hello, World!'; } print[device=serial]
      
      #9 {
        filter isLow. map HIGH;
      } #1
    `;

    const parseResult = run(parse, sampleSource);

    //@ts-ignore
    console.log(JSON.stringify(parseResult.right));

    expect(isRight(parseResult)).toBeTruthy();
  });
});