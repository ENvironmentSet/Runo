import { RunoValue } from './Value';
import { createError, RunoEvalResult } from './Runtime';

export class Environment {
  bindings: Map<string, RunoValue>;
  parent?: Environment;

  constructor(predefined: Record<string, RunoValue>, parent?: Environment) {
    this.bindings = new Map(Object.entries(predefined));
    this.parent = parent;
  }

  createBinding(id: string, value: RunoValue): RunoEvalResult {
    if (this.bindings.has(id)) return createError(`cannot redefine binding ${id}`);

    this.bindings.set(id, value);

    return value;
  }

  resolve(id: string): RunoEvalResult {
    if (this.bindings.has(id)) return this.bindings.get(id)!;
    else if (this.parent) return this.parent.resolve(id);
    else return createError(`cannot resolve binding '${id}'`);
  }
}