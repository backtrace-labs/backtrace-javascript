import 'jest-extended';
import path from 'path';

export function expectPath(expected: string) {
    return expect.toSatisfy((actual) => path.resolve(expected) === path.resolve(actual))
  }
