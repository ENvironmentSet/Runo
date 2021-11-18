import { Cell } from 'sodiumjs';
import { RunoValue, equals } from './Value';

export abstract class Selector {
  associatedSelector?: Selector;

  protected constructor(associatedSelector?: Selector) {
    this.associatedSelector = associatedSelector;
  }

  abstract check(id: string, binding: Binding): boolean;
}

export class IdSelector extends Selector {
  id: string;

  constructor(id: string, associatedSelector?: Selector) {
    super(associatedSelector);
    this.id = id;
  }

  check(id: string, binding: Binding): boolean {
    return this.id === id && (this.associatedSelector ? this.associatedSelector.check(id, binding) : true);
  }
}

export class MetaPropertySelector extends Selector {
  metaPropKey: string;
  metaPropValue: RunoValue;

  constructor(metaPropKey: string, metaPropValue: RunoValue, associatedSelector?: Selector) {
    super(associatedSelector);
    this.metaPropKey = metaPropKey;
    this.metaPropValue = metaPropValue;
  }

  check(id: string, binding: Binding): boolean {
    return Reflect.has(binding.meta, this.metaPropKey) && equals(this.metaPropValue, binding.meta[this.metaPropKey]) && (this.associatedSelector ? this.associatedSelector.check(id, binding) : true);
  }
}

export class Binding {
  value: RunoValue;
  meta: Record<string, RunoValue>;

  constructor(value: RunoValue, meta: Record<string, RunoValue> = {}) {
    this.value = value;
    this.meta = meta;
  }
}

export class Environment$ extends Cell<Map<string, Binding>> {
  constructor(initEnv: Record<string, Binding>) {
    super(new Map(Object.entries(initEnv)));
  }

  static select(environment$: Environment$, selector: Selector): Cell<RunoValue[]> {
    return environment$.map(env => {
      return [...env.entries()].filter(([id, binding]) => selector.check(id, binding)).map(([_, binding]) => binding.value);
    });
  }

  static addBinding(environment$: Environment$, key: string, value: RunoValue): Environment$ {
    return environment$.map(env => env.set(key, new Binding(value)));
  }

  static extend(base$: Environment$, initEnv: Record<string, Binding>): Environment$ {
    return base$.map(env => new Map([...env.entries(), ...Object.entries(initEnv)]));
  }
}