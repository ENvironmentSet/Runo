import { Cell } from 'sodiumjs';
import { RunoValue, equals } from './Value';

type SelectorConstructorParameters = {
  id?: string;
  metadataConditions: [string, RunoValue][] & [[string, RunoValue]];
} | {
  id: string;
  metadataConditions: [string, RunoValue][];
}

export class Selector {
  id?: string;
  metadataConditions: [string, RunoValue][];

  constructor({ id, metadataConditions }: SelectorConstructorParameters) {
    this.id = id;
    this.metadataConditions = metadataConditions;
  }
}

export class Binding {
  value: RunoValue;
  meta: Record<string, RunoValue>;

  constructor(value: RunoValue, meta: Record<string, RunoValue> = {}) {
    this.value = value;
    this.meta = meta;
  }

  checkSelector({ metadataConditions }: Selector): boolean {
    return metadataConditions.every(([key, value]) => equals(this.meta[key], value));
  }
}

export class Environment$ extends Cell<Map<string, Binding>> {
  constructor(initEnv: Record<string, Binding>) {
    super(new Map(Object.entries(initEnv)));
  }

  static select(environment$: Environment$, selector: Selector): Cell<Binding[]> {
    return environment$.map(env => {
      if (!selector.id && env.get(selector.id!)?.checkSelector(selector)) {
        return [env.get(selector.id!)!];
      } else return [...env.values()].filter(binding => binding.checkSelector(selector));
    });
  }

  static addBinding(environment$: Environment$, key: string, value: RunoValue): Environment$ {
    return environment$.map(env => env.set(key, new Binding(value)));
  }

  static extend(base$: Environment$, initEnv: Record<string, Binding>): Environment$ {
    return base$.map(env => new Map([...env.entries(), ...Object.entries(initEnv)]));
  }
}