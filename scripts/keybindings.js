import { QS_MODULE_ID } from './constants.js';
import { getActiveLayer, isAssistantOrHigher, runAsync } from './helpers.js';
import { randomizeRotation, randomizeScale, revertPrototype, updatePrototype, updateSize } from './actions.js';

export async function registerKeyBindings() {
  const defaultKeys = [
    {
      id: 'scale-down',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Down'),
      key: 'BracketLeft',
      action: () => onScaleKeybind('scale-down', false),
    },
    {
      id: 'scale-up',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Up'),
      key: 'BracketRight',
      action: () => onScaleKeybind('scale-up', false),
    },
    {
      id: 'scale-down-large',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Down_Large'),
      hint: game.i18n.localize('QSCALE.KEYS.Large_Step_Hint'),
      key: 'BracketLeft',
      mods: ['SHIFT'],
      action: () => onScaleKeybind('scale-down', true),
    },
    {
      id: 'scale-up-large',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Up_Large'),
      hint: game.i18n.localize('QSCALE.KEYS.Large_Step_Hint'),
      key: 'BracketRight',
      mods: ['SHIFT'],
      action: () => onScaleKeybind('scale-up', true),
    },
    {
      id: 'random-scale',
      name: game.i18n.localize('QSCALE.KEYS.Random_Scale'),
      hint: game.i18n.localize('QSCALE.KEYS.Random_Scale_Hint'),
      key: 'BracketLeft',
      mods: ['SHIFT'],
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
      action: () => onRandomScaleKeybind('scale-down'),
    },
    {
      id: 'random-rotation',
      name: game.i18n.localize('QSCALE.KEYS.Random_Rotation'),
      hint: game.i18n.localize('QSCALE.KEYS.Random_Rotation_Hint'),
      key: 'BracketRight',
      mods: ['SHIFT'],
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
      action: () => onRandomRotationKeybind('scale-up'),
    },
    {
      id: 'revert-prototype',
      name: game.i18n.localize('QSCALE.KEYS.Revert_Prototype'),
      hint: game.i18n.localize('QSCALE.KEYS.Revert_Prototype_Hint'),
      key: 'Backslash',
      action: () => onRevertPrototypeKeybind(),
    },
    {
      id: 'update-prototype',
      name: game.i18n.localize('QSCALE.KEYS.Update_Prototype'),
      hint: game.i18n.localize('QSCALE.KEYS.Update_Prototype_Hint'),
      key: 'Backslash',
      mods: ['SHIFT'],
      action: () => onUpdatePrototypeKeybind(),
    },
  ];

  for (const key of defaultKeys) {
    game.keybindings.register(QS_MODULE_ID, key.id, {
      name: key.name,
      hint: key.hint,
      editable: [{ key: key.key, modifiers: key.mods }],
      precedence: key.precedence,
      restricted: key.restricted,
      onDown: () => key.action(),
    });
  }
}

function onScaleKeybind(action, largeStep) {
  const layer = getActiveLayer();
  const authorized = isAssistantOrHigher();

  if (layer instanceof TokenLayer) {
    if (!authorized || !canvas.tokens.controlled.length) return false;
  } else if (layer instanceof TilesLayer) {
    if (!authorized || !canvas.tiles.controlled.length) return false;
  } else if (layer instanceof LightingLayer) {
    if (!authorized || !canvas.lighting.hover?.document) return false;
  } else if (layer instanceof SoundsLayer) {
    if (!authorized || !canvas.sounds.hover?.document) return false;
  } else if (layer instanceof TemplateLayer) {
    if (!canvas.templates.hover?.document) return false;
  } else {
    return false;
  }

  runAsync(() => updateSize(action, largeStep));
  return true;
}

function onRandomScaleKeybind(key) {
  const layer = getActiveLayer();
  const authorized = isAssistantOrHigher();

  if (layer instanceof TokenLayer || layer instanceof TilesLayer) {
    if (!authorized) return false;
    if (!canvas.tokens.controlled.length && !canvas.tiles.controlled.length) return false;
    runAsync(() => randomizeScale());
    return true;
  }

  return onScaleKeybind(key, true);
}

function onRandomRotationKeybind(key) {
  const layer = getActiveLayer();
  const authorized = isAssistantOrHigher();

  if (layer instanceof TokenLayer || layer instanceof TilesLayer) {
    if (!authorized) return false;
    if (!canvas.tokens.controlled.length && !canvas.tiles.controlled.length) return false;
    runAsync(() => randomizeRotation());
    return true;
  }

  return onScaleKeybind(key, true);
}

function onUpdatePrototypeKeybind() {
  if (!(getActiveLayer() instanceof TokenLayer)) return false;
  if (!isAssistantOrHigher()) return false;
  if (!canvas.tokens.controlled.some((t) => t.document.actorId)) return false;
  runAsync(() => updatePrototype());
  return true;
}

function onRevertPrototypeKeybind() {
  if (!(getActiveLayer() instanceof TokenLayer)) return false;
  if (!isAssistantOrHigher()) return false;
  if (!canvas.tokens.controlled.some((t) => t.document.actor?.prototypeToken?.texture)) return false;
  runAsync(() => revertPrototype());
  return true;
}
