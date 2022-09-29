// Static values for incremental scaling up/down.
const QS_Scale_Up = 1.05;
const QS_Scale_Down = 0.95;

// Animations provided by @Jinker — https://www.patreon.com/jinker
const QS_Save_Animation_Path = 'modules/quickscale/assets/spinburst2.webm';
const QS_Revert_Animation_Path = 'modules/quickscale/assets/boom7.webm';

async function setDefaultSettings() {
  const defaultSettings = [
    { id: 'token-random-min', name: '', hint: '', type: Number, default: 0.8 },
    { id: 'token-random-max', name: '', hint: '', type: Number, default: 1.2 },
    { id: 'tile-random-min', name: '', hint: '', type: Number, default: 0.9 },
    { id: 'tile-random-max', name: '', hint: '', type: Number, default: 1.1 },
    {
      id: 'token-random-label',
      name: game.i18n.localize('QSCALE.Token_Random_Range'),
      type: Boolean,
      default: true,
    },
    {
      id: 'tile-random-label',
      name: game.i18n.localize('QSCALE.Tile_Random_Range'),
      type: Boolean,
      default: true,
    },
    {
      id: 'rotation-amount',
      name: game.i18n.localize('QSCALE.Rotation_Amount'),
      hint: game.i18n.localize('QSCALE.Rotation_Amount_Hint'),
      type: Number,
      default: 15,
    },
  ];

  for (const setting of defaultSettings) {
    game.settings.register('quickscale', setting.id, {
      name: setting.name,
      hint: setting.hint,
      scope: 'world',
      config: true,
      type: setting.type,
      default: setting.default,
    });
  }
}

async function setKeyBindings() {
  const defaultKeys = [
    {
      id: 'scale-down',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Down'),
      key: 'BracketLeft',
      action: () => updateSize('scale-down', false),
    },
    {
      id: 'scale-up',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Up'),
      key: 'BracketRight',
      action: () => updateSize('scale-up', false),
    },
    {
      id: 'scale-down-large',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Down_Large'),
      hint: game.i18n.localize('QSCALE.KEYS.Large_Step_Hint'),
      key: 'BracketLeft',
      mods: ['SHIFT'],
      action: () => updateSize('scale-down', true),
    },
    {
      id: 'scale-up-large',
      name: game.i18n.localize('QSCALE.KEYS.Scale_Up_Large'),
      hint: game.i18n.localize('QSCALE.KEYS.Large_Step_Hint'),
      key: 'BracketRight',
      mods: ['SHIFT'],
      action: () => updateSize('scale-up', true),
    },
    {
      id: 'random-scale',
      name: game.i18n.localize('QSCALE.KEYS.Random_Scale'),
      hint: game.i18n.localize('QSCALE.KEYS.Random_Scale_Hint'),
      key: 'BracketLeft',
      mods: ['SHIFT'],
      restricted: true,
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
      action: () => handleRandomScaleKey(game.canvas.activeLayer.name, 'scale-down'),
    },
    {
      id: 'random-rotation',
      name: game.i18n.localize('QSCALE.KEYS.Random_Rotation'),
      hint: game.i18n.localize('QSCALE.KEYS.Random_Rotation_Hint'),
      key: 'BracketRight',
      mods: ['SHIFT'],
      restricted: true,
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
      action: () => handleRandomRotationKey(game.canvas.activeLayer.name, 'scale-up'),
    },
    {
      id: 'revert-prototype',
      name: game.i18n.localize('QSCALE.KEYS.Revert_Prototype'),
      hint: game.i18n.localize('QSCALE.KEYS.Revert_Prototype_Hint'),
      key: 'Backslash',
      restricted: true,
      action: () => {
        if (game.canvas.activeLayer.name == 'TokenLayer') revertPrototype();
      },
    },
    {
      id: 'update-prototype',
      name: game.i18n.localize('QSCALE.KEYS.Update_Prototype'),
      hint: game.i18n.localize('QSCALE.KEYS.Update_Prototype_Hint'),
      key: 'Backslash',
      mods: ['SHIFT'],
      restricted: true,
      action: () => {
        if (game.canvas.activeLayer.name == 'TokenLayer') updatePrototype();
      },
    },
  ];

  for (const key of defaultKeys) {
    game.keybindings.register('quickscale', key.id, {
      name: key.name,
      hint: key.hint,
      editable: [{ key: key.key, modifiers: key.mods }],
      precedence: key.precedence,
      restricted: key.restricted,
      onDown: () => {
        key.action();
        return true;
      },
    });
  }
}

Hooks.on('init', function () {
  setDefaultSettings();
  setKeyBindings();
});

Hooks.on('renderSettingsConfig', () => {
  // This is all GM-only.
  if (game.user.role < CONST.USER_ROLES.ASSISTANT) return;

  // Hide the inputs that will hold the values but shouldn't be visible.
  $('input[name="quickscale.token-random-min"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.token-random-max"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.token-random-label"]').css('display', 'none');
  $('input[name="quickscale.tile-random-min"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.tile-random-max"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.tile-random-label"]').css('display', 'none');

  // Find the right elements to insert after, and build the divs for insertion.
  const tokenSliderLocation = $('input[name="quickscale.token-random-label"]').parent().next();
  const tokenSliderInjection = `<div id="quickscale-token-slider"></div>`;
  const tileSliderLocation = $('input[name="quickscale.tile-random-label"]').parent().next();
  const tileSliderInjection = `<div id="quickscale-tile-slider"></div>`;

  // Only inject these if they aren't already there.
  if (!$('#quickscale-token-slider').length) {
    tokenSliderLocation.after(tokenSliderInjection);
  }
  if (!$('#quickscale-tile-slider').length) {
    tileSliderLocation.after(tileSliderInjection);
  }

  // Create a custom two-handled slider for the token scale range.
  const tokenSlider = document.getElementById('quickscale-token-slider');

  noUiSlider.create(tokenSlider, {
    start: [
      game.settings.get('quickscale', 'token-random-min'),
      game.settings.get('quickscale', 'token-random-max'),
    ],
    tooltips: [wNumb({ decimals: 1 }), wNumb({ decimals: 1 })],
    behaviour: 'drag-all',
    step: 0.1, // Snap to tenths.
    margin: 0.2, // Minimum gap between the two handles.
    padding: 0.1, // Gap at either end.
    connect: true, // Form coloured span between handles.
    range: {
      min: 0.2, // Minimum token scale of 0.3, minus padding.
      max: 3.1, // Maximum token scale of 3.0, plus padding.
    },
  });

  // Create a second two-handled slider for the tile scale range.
  const tileSlider = document.getElementById('quickscale-tile-slider');

  noUiSlider.create(tileSlider, {
    start: [
      game.settings.get('quickscale', 'tile-random-min'),
      game.settings.get('quickscale', 'tile-random-max'),
    ],
    tooltips: [wNumb({ decimals: 1 }), wNumb({ decimals: 1 })],
    behaviour: 'drag-all',
    step: 0.1, // Snap to tenths.
    margin: 0.1, // Minimum gap between the two handles.
    padding: 0.1, // Gap at either end.
    connect: true, // Form coloured span between handles.
    range: {
      min: 0.4, // Minimum randomization range of 0.5, minus padding.
      max: 1.6, // Maximum randomization range of 1.5, plus padding.
    },
  });

  // Tweak to accommodate TidyUI's smaller available space.
  if (game.modules.get('tidy-ui_game-settings')?.active) {
    $('.noUi-base').css({
      width: '480px',
    });
    $('#quickscale-token-slider').css({
      transform: 'translate(30px, 5px)',
    });
    $('#quickscale-tile-slider').css({
      transform: 'translate(30px, 5px)',
    });
  }

  tokenSlider.noUiSlider.on('change', saveTokenRange);
  tileSlider.noUiSlider.on('change', saveTileRange);
});

function handleRandomScaleKey(currentToolLayer, key) {
  switch (currentToolLayer) {
    case 'TokenLayer':
    case 'TilesLayer':
      randomizeScale();
      break;
    case 'TemplateLayer':
    case 'LightingLayer':
    case 'SoundsLayer':
      updateSize(key, true);
      break;
  }
}

function handleRandomRotationKey(currentToolLayer, key) {
  switch (currentToolLayer) {
    case 'TokenLayer':
    case 'TilesLayer':
      randomizeRotation();
      break;
    case 'TemplateLayer':
    case 'LightingLayer':
    case 'SoundsLayer':
      updateSize(key, true);
      break;
  }
}

// On slider changes, save the new values into the actual inputs.
function saveTokenRange(values, handle, unencoded, tap, positions, noUiSlider) {
  $('input[name="quickscale.token-random-min"]').val(values[0]);
  $('input[name="quickscale.token-random-max"]').val(values[1]);
}

function saveTileRange(values, handle, unencoded, tap, positions, noUiSlider) {
  $('input[name="quickscale.tile-random-min"]').val(values[0]);
  $('input[name="quickscale.tile-random-max"]').val(values[1]);
}

// Main scaling function.
async function updateSize(action, largeStep) {
  let increase = false;
  if (action == 'scale-up') increase = true;

  // Token, tile, light, and sound controls are only for Assistant or higher.
  const authorized = game.user.role >= CONST.USER_ROLES.ASSISTANT;

  switch (game.canvas.activeLayer.name) {
    case 'TokenLayer':
      // Update controlled tokens.
      if (authorized) {
        await canvas.tokens.updateAll(
          (t) => ({
            texture: {
              scaleX: getNewTokenScale(t.document.texture.scaleX, increase),
              scaleY: getNewTokenScale(t.document.texture.scaleX, increase),
            },
          }),
          (t) => t.controlled,
          { animate: false }
        );
      }
      break;
    case 'TilesLayer':
      // Update controlled tiles.
      if (authorized) {
        const controlledTiles = canvas.tiles.controlled;
        const tileUpdates = controlledTiles.map((t) => ({
          _id: t.id,
          width: t.document.width * (increase ? QS_Scale_Up : QS_Scale_Down),
          height: t.document.height * (increase ? QS_Scale_Up : QS_Scale_Down),
        }));
        await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
      }
      break;
    case 'LightingLayer':
      // Update hovered light.
      if (authorized) {
        const hoveredLight = canvas.lighting.hover?.document;
        if (hoveredLight) {
          let currentDim = hoveredLight.config.dim;
          let currentBright = hoveredLight.config.bright;
          if (largeStep) {
            await hoveredLight.update({
              'config.dim': increase
                ? Math.floor(currentDim + 5)
                : Math.max(Math.ceil(currentDim - 5), 0),
              'config.bright': increase
                ? Math.floor(currentBright + 5)
                : Math.max(Math.ceil(currentBright - 5), 0),
            });
          } else {
            await hoveredLight.update({
              'config.dim': increase
                ? Math.floor(currentDim + 1)
                : Math.max(Math.ceil(currentDim - 1), 0),
              'config.bright': increase
                ? Math.floor(currentBright + 1)
                : Math.max(Math.ceil(currentBright - 1), 0),
            });
          }
        }
      }
      break;
    case 'SoundsLayer':
      // Update hovered sound.
      if (authorized) {
        const hoveredSound = canvas.sounds.hover?.document;
        if (hoveredSound) {
          const currentRadius = hoveredSound.radius;
          if (largeStep) {
            await hoveredSound.update({
              radius: increase
                ? Math.floor(currentRadius + 5)
                : Math.max(Math.ceil(currentRadius - 5), 0),
            });
          } else {
            await hoveredSound.update({
              radius: increase
                ? Math.floor(currentRadius + 1)
                : Math.max(Math.ceil(currentRadius - 1), 0),
            });
          }
        }
      }
      break;
    case 'TemplateLayer':
      // Update hovered template. Allowed at the player level.
      const hoveredTemplate = canvas.templates.hover?.document;
      if (hoveredTemplate) {
        const currentDistance = hoveredTemplate.distance;
        if (largeStep) {
          await hoveredTemplate.update({
            distance: increase
              ? Math.floor(currentDistance + 5)
              : Math.max(Math.ceil(currentDistance - 5), 1),
          });
        } else {
          await hoveredTemplate.update({
            distance: increase
              ? Math.floor(currentDistance + 1)
              : Math.max(Math.ceil(currentDistance - 1), 1),
          });
        }
      }
      break;
  }
}

// Push current scales to prototypes.
async function updatePrototype() {
  // Not for players.
  if (game.user.role < CONST.USER_ROLES.ASSISTANT) return;

  const controlledTokens = canvas.tokens.controlled.map((t) => {
    return {
      actorID: t.document.actorId,
      scaleX: t.document.texture.scaleX,
      scaleY: t.document.texture.scaleY,
    };
  });

  // Update the base actor data with the instanced tokens' current scales.
  const actorUpdates = controlledTokens.map((entry) => ({
    _id: entry.actorID,
    'prototypeToken.texture.scaleX': entry.scaleX,
    'prototypeToken.texture.scaleY': entry.scaleY,
  }));
  Actor.updateDocuments(actorUpdates);

  // Fire off an animation for visual feedback.
  for (let t of canvas.tokens.controlled) {
    await createAnimation(true, t.document._id);
  }
}

// Revert scales to original prototype scales.
async function revertPrototype() {
  // Not for players.
  if (game.user.role < CONST.USER_ROLES.ASSISTANT) return;

  // Update controlled tokens.
  await canvas.tokens.updateAll(
    (t) => ({
      texture: {
        scaleX: t.document._actor.prototypeToken.texture.scaleX,
        scaleY: t.document._actor.prototypeToken.texture.scaleY,
      },
    }),
    (t) => t.controlled
  );

  // Fire off an animation for visual feedback.
  for (let t of canvas.tokens.controlled) {
    await createAnimation(false, t.document._id);
  }
}

// Scale randomizer. Pulls from range set in module settings.
async function randomizeScale() {
  // Not for players.
  if (game.user.role < CONST.USER_ROLES.ASSISTANT) return;

  // Randomize token scales.
  if (canvas.tokens.controlled.length > 0) {
    const newScale =
      Math.round(
        getRandomArbitrary(
          game.settings.get('quickscale', 'token-random-min'),
          game.settings.get('quickscale', 'token-random-max')
        ) * 10
      ) / 10; // Extra math here is for decimal truncation.

    await canvas.tokens.updateAll(
      (t) => ({
        texture: {
          scaleX: newScale,
          scaleY: newScale,
        },
      }),
      (t) => t.controlled,
      { animate: false }
    );
  }

  // Randomize tile scales.
  if (canvas.tiles.controlled.length > 0) {
    const tileUpdates = canvas.tiles.controlled.map((t) => {
      const randomTileScale = getRandomArbitrary(
        game.settings.get('quickscale', 'tile-random-min'),
        game.settings.get('quickscale', 'tile-random-max')
      );
      return {
        _id: t.id,
        width: Math.round(t.document.width * randomTileScale),
        height: Math.round(t.document.height * randomTileScale),
      };
    });

    await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
  }
}

// Rotation randomizer for tiles.
async function randomizeRotation() {
  // Not for players.
  if (game.user.role < CONST.USER_ROLES.ASSISTANT) return;

  const rotation = game.settings.get('quickscale', 'rotation-amount');

  // Update controlled tokens. Check for rotation lock, don't rotate if true.
  await canvas.tokens.updateAll(
    (t) => ({
      rotation: t.document.lockRotation
        ? t.document.rotation
        : Math.round(t.document.rotation + getRandomArbitrary(0 - rotation, rotation)),
    }),
    (t) => t.controlled
  );

  // Update controlled tiles.
  const tileUpdates = canvas.tiles.controlled.map((t) => {
    return {
      _id: t.id,
      rotation: Math.round(t.document.rotation + getRandomArbitrary(0 - rotation, rotation)),
    };
  });
  await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getNewTokenScale(old, increase) {
  // Get values for the increment/decrement processes.
  let newScale = old;
  if (increase) {
    newScale = Math.min(Math.round((old + 0.1) * 10) / 10, 10);
  } else {
    newScale = Math.max(Math.round((old - 0.1) * 10) / 10, 0.3);
  }
  return newScale;
}

// This whole bit was cribbed from Kandashi's Next Up module:
// https://github.com/kandashi/Next-Up
async function createAnimation(save, tokenID) {
  const token = canvas.tokens.get(tokenID);
  const animationTexture = await loadTexture(
    save ? QS_Save_Animation_Path : QS_Revert_Animation_Path
  );
  const textureSize = canvas.grid.size + canvas.dimensions.size;
  animationTexture.orig = {
    height: save ? textureSize : textureSize / 2,
    width: save ? textureSize : textureSize / 2,
    x: textureSize / 2,
    y: textureSize / 2,
  };
  let sprite = new PIXI.Sprite(animationTexture);
  sprite.anchor.set(0.5);
  let animation = token.addChild(sprite);
  animation.position.x = (canvas.grid.w * token.document.width) / 2;
  animation.position.y = (canvas.grid.h * token.document.height) / 2;
  animation.visible = true;
  const source = getProperty(animation._texture, 'baseTexture.resource.source');
  //source.loop = false;
  //source.offset = 0;
  game.video.play(source, { loop: false, offset: 0 });
  setTimeout(
    () => {
      token.removeChild(sprite);
    },
    save ? 1200 : 1800
  );
}
