import { SimpleElement } from '@simple-dom/interface';
import {
  Dict,
  ModifierManager,
  GlimmerTreeChanges,
  DynamicScope,
  VMArguments,
  CapturedArguments,
} from '@glimmer/interfaces';
import { Tag, consumeTag } from '@glimmer/validator';

export interface TestModifierConstructor {
  new (): TestModifierInstance;
}

export interface TestModifierInstance {
  element?: SimpleElement;
  didInsertElement?(_params: unknown[], _hash: Dict<unknown>): void;
  didUpdate?(_params: unknown[], _hash: Dict<unknown>): void;
  willDestroyElement?(): void;
}

export class TestModifierDefinitionState {
  instance?: TestModifierInstance;
  constructor(Klass?: TestModifierConstructor) {
    if (Klass) {
      this.instance = new Klass();
    }
  }
}

export class TestModifierManager
  implements ModifierManager<TestModifier, TestModifierDefinitionState> {
  create(
    element: SimpleElement,
    state: TestModifierDefinitionState,
    args: VMArguments,
    _dynamicScope: DynamicScope,
    dom: GlimmerTreeChanges
  ) {
    return new TestModifier(element, state, args.capture(), dom);
  }

  getTag({ args: { tag } }: TestModifier): Tag {
    return tag;
  }

  install({ element, args, state }: TestModifier) {
    consumeTag(args.tag);

    if (state.instance && state.instance.didInsertElement) {
      state.instance.element = element;
      state.instance.didInsertElement(args.positional.value(), args.named.value());
    }

    return;
  }

  update({ args, state }: TestModifier) {
    consumeTag(args.tag);

    if (state.instance && state.instance.didUpdate) {
      state.instance.didUpdate(args.positional.value(), args.named.value());
    }

    return;
  }

  teardown(modifier: TestModifier): void {
    let { state } = modifier;
    if (state.instance && state.instance.willDestroyElement) {
      state.instance.willDestroyElement();
    }
  }
}

export class TestModifier {
  constructor(
    public element: SimpleElement,
    public state: TestModifierDefinitionState,
    public args: CapturedArguments,
    public dom: GlimmerTreeChanges
  ) {}
}
