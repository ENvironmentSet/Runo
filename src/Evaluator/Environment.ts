import { RunoValue } from './Value';
import { createError, RunoError, RunoEvalResult } from './Runtime';

export class Environment {
  bindings: Map<string, RunoValue>;
  drivers: Map<string, (x: RunoValue) => void>;
  parent?: Environment;

  constructor(predefined: Record<string, RunoValue>, parent?: Environment, drivers: Record<string, (x: RunoValue) => void> = {}) {
    this.bindings = new Map(Object.entries(predefined).concat([['True', true], ['False', false]]));
    this.parent = parent;
    this.drivers = new Map(Object.entries(drivers));
  }

  createBinding(id: string, value: RunoValue): RunoError | void {
    if (this.bindings.has(id)) return createError(`cannot redefine binding "${id}"`);

    this.bindings.set(id, value);
  }

  resolve(id: string): RunoEvalResult {
    if (this.bindings.has(id)) return this.bindings.get(id)!;
    else if (this.parent) return this.parent.resolve(id);
    else return createError(`cannot resolve binding "${id}"`);
  }

  resolveDriver(name: string): ((x: RunoValue) => void) | RunoError {
    if (this.drivers.has(name)) return this.drivers.get(name)!;
    else if (this.parent) return this.parent.resolveDriver(name);
    else return createError(`cannot resolve binding "${name}"`);
  }

  createDriver(name: string, driver: (x: RunoValue) => void): RunoError | void {
    if (this.drivers.has(name)) return createError(`cannot redefine driver "${name}"`);

    this.drivers.set(name, driver);
  }
}