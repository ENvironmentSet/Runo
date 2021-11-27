import { RunoValue, equals } from './Value';
import { createError, RunoEvalResult } from './Runtime';

export abstract class Selector {
  associatedSelector?: Selector;

  protected constructor(associatedSelector?: Selector) {
    this.associatedSelector = associatedSelector;
  }

  delegateCheck(binding: Binding) {
    return this.associatedSelector ? this.associatedSelector.check(binding) : true;
  }

  abstract check(binding: Binding): boolean;
}

export class IdSelector extends Selector {
  id: string;

  constructor(id: string, associatedSelector?: Selector) {
    super(associatedSelector);
    this.id = id;
  }

  check(binding: Binding): boolean {
    return this.id === binding.id && this.delegateCheck(binding);
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

  check(binding: Binding): boolean {
    return Reflect.has(binding.meta, this.metaPropKey) &&
           equals(this.metaPropValue, binding.meta[this.metaPropKey]) &&
           this.delegateCheck(binding);
  }
}

export class Binding {
  id: string;
  value: RunoValue;
  meta: Record<string, RunoValue>;

  constructor(id: string, value: RunoValue, meta: Record<string, RunoValue> = {}) {
    this.id = id;
    this.value = value;
    this.meta = meta;
  }
}

export class Environment {
  bindings: Map<string, Binding>;
  parent?: Environment;

  constructor(bindings: Record<string, Binding>, parent?: Environment) {
    this.bindings = new Map(Object.entries(bindings));
    this.parent = parent;
  }

  addBinding(binding: Binding) {
    this.bindings.set(binding.id, binding);
  }

  resolveOwnBinding(selector: Selector): RunoValue[] {
    return [...this.bindings.values()].filter(binding => selector.check(binding));
  }

  resolve(selector: Selector): RunoEvalResult {
    const ownBindings = this.resolveOwnBinding(selector);
    let parent = this.parent;
    let inheritedBindings = [];

    while (parent) {
      inheritedBindings.push(...parent.resolveOwnBinding(selector));
      parent = parent.parent;
    }

    const result = ownBindings.concat(inheritedBindings);

    if (result.length === 0) return [createError('Nothings were selected by selector')];
    else return result as RunoEvalResult;
  }
}