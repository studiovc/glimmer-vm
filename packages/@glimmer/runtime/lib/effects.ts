import { Effect } from '@glimmer/interfaces';
import { LinkedList, ListNode, DESTROY, associate, assert, Option } from '@glimmer/util';
import { memo } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';

export enum EffectPhase {
  'layout' = 'layout',
}

interface EffectHooks {
  setup(): void;
  update(): void;
  teardown(): void;
}

export class EffectImpl implements Effect {
  constructor(private hooks: EffectHooks) {}

  private didSetup = false;

  createOrUpdate = memo(() => {
    if (this.didSetup === false) {
      this.didSetup = true;
      this.hooks.setup();
    } else {
      this.hooks.update();
    }
  });

  [DESTROY]() {
    this.hooks.teardown();
  }
}

function defaultScheduleEffects(_phase: EffectPhase, callback: () => void) {
  callback();
}

class EffectQueue {
  effects: LinkedList<ListNode<Effect>> = new LinkedList();
  currentHead: Option<ListNode<Effect>> = null;

  revalidate = () => this.effects.forEachNode(n => n.value.createOrUpdate());
}

export class EffectManager {
  private inTransaction = false;

  constructor(private scheduleEffects = defaultScheduleEffects) {
    let queues: Record<string, EffectQueue> = {};

    for (let phase in EffectPhase) {
      queues[phase] = new EffectQueue();
    }

    this.queues = queues as { [key in EffectPhase]: EffectQueue };
  }

  private queues: { [key in EffectPhase]: EffectQueue };

  begin() {
    if (DEBUG) {
      this.inTransaction = true;
    }
  }

  registerEffect(phase: EffectPhase, effect: Effect) {
    assert(this.inTransaction, 'You cannot register effects unless you are in a transaction');

    let queue = this.queues[phase];
    let effects = queue.effects;
    let newNode = new ListNode(effect);

    effects.insertBefore(newNode, queue.currentHead);

    associate(effect, {
      [DESTROY]() {
        effects.remove(newNode);
      },
    });
  }

  commit() {
    if (DEBUG) {
      this.inTransaction = false;
    }

    let { queues, scheduleEffects } = this;

    for (let phase in EffectPhase) {
      let queue = queues[phase as EffectPhase];

      scheduleEffects(phase as EffectPhase, queue.revalidate);

      queue.currentHead = queue.effects.head();
    }
  }
}
