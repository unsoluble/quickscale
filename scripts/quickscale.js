// Keybinds.
const QS_Reduce_Key = '[';
const QS_Enlarge_Key = ']';
const QS_Large_Reduce_Key = '{';
const QS_Large_Enlarge_Key = '}';
const QS_Random_Scale_Key = '{';
const QS_Random_Rotate_Key = '}';
const QS_Prototype_Key = '|';

const QS_Scale_Up = 1.05;
const QS_Scale_Down = 0.95;

// Animation provided by @Jinker — https://www.patreon.com/jinker
const QS_Animation_Path = 'modules/quickscale/assets/spinburst2.webm';

Hooks.on('init', function () {
  game.settings.register('quickscale', 'random-min', {
    name: 'Random Min',
    scope: 'world',
    config: true,
    type: Number,
    default: 0.8,
  });

  game.settings.register('quickscale', 'random-max', {
    name: 'Random Max',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.2,
  });

  game.settings.register('quickscale', 'token-random-label', {
    name: game.i18n.localize('QSCALE.Token_Random_Range'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('quickscale', 'tile-random-label', {
    name: game.i18n.localize('QSCALE.Tile_Random_Range'),
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register('quickscale', 'rotation-amount', {
    name: game.i18n.localize('QSCALE.Rotation_Amount'),
    hint: game.i18n.localize('QSCALE.Rotation_Amount_Hint'),
    scope: 'world',
    config: true,
    type: Number,
    default: 15,
  });

  // Future optional DF Hotkeys integration, not yet functional.
  /*
  if (game.modules.get('lib-df-hotkeys')?.active) {
    Hotkeys.registerGroup({
      name: 'quickscale.qs-group',
      label: 'QuickScale',
    });

    Hotkeys.registerShortcut({
      name: 'quickscale.reduce-key',
      label: 'Reduce',
      group: 'quickscale.qs-group',
      get: () => game.settings.get('quickscale', 'reduce-key'),
      set: async (value) => await game.settings.set('quickscale', 'reduce-key', value),
      default: () => {
        return { key: Hotkeys.keys.BracketLeft, alt: false, ctrl: false, shift: false };
      },
      onKeyDown: (self) => {
        console.log('Reduce!');
      },
    });
  }
  */
});

Hooks.on('ready', () => {
  window.addEventListener('keypress', (e) => {
    // Don't trigger if we're in a text entry field.
    if (document.activeElement instanceof HTMLInputElement) return;
    if (document.activeElement instanceof HTMLTextAreaElement) return;
    if (document.activeElement.getAttribute('contenteditable') === 'true') return;

    // This is all GM-only for now.
    if (!game.user.isGM) return;

    if (e.key == QS_Reduce_Key || e.key == QS_Enlarge_Key) {
      updateSize(e.key, false);
    }
    if (e.key == QS_Random_Scale_Key) {
      switch (game.canvas.activeLayer.name) {
        case 'TokenLayer':
        case 'BackgroundLayer':
          randomizeScale();
          break;
        case 'TemplateLayer':
        case 'LightingLayer':
        case 'SoundsLayer':
          updateSize(e.key, true);
          break;
      }
    }
    if (e.key == QS_Random_Rotate_Key) {
      switch (game.canvas.activeLayer.name) {
        case 'TokenLayer':
          randomizeRotation();
          break;
        case 'BackgroundLayer':
          randomizeRotation();
          break;
        case 'TemplateLayer':
        case 'LightingLayer':
        case 'SoundsLayer':
          updateSize(e.key, true);
          break;
      }
    }
    if (e.key == QS_Prototype_Key && game.canvas.activeLayer.name == 'TokenLayer') {
      updatePrototype();
    }
  });
});

Hooks.on('renderSettingsConfig', () => {
  // Hide the inputs that will hold the values but shouldn't be visible.
  $('input[name="quickscale.random-min"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.random-max"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.token-random-label"]').css('display', 'none');

  // Find the right element to insert after, and insert.
  const insertionElement = $('input[name="quickscale.token-random-label"]').parent().next();
  const injection = `<div id="quickscale-random-slider"></div>`;

  // Only inject if it isn't already there.
  if (!$('#quickscale-random-slider').length) {
    insertionElement.after(injection);
  }

  // Create a custom two-handled slider.
  const slider = document.getElementById('quickscale-random-slider');

  noUiSlider.create(slider, {
    start: [
      game.settings.get('quickscale', 'random-min'),
      game.settings.get('quickscale', 'random-max'),
    ],
    tooltips: [wNumb({ decimals: 1 }), wNumb({ decimals: 1 })],
    behaviour: 'drag-all',
    step: 0.1,
    margin: 0.2,
    padding: 0.1,
    connect: true,
    range: {
      min: 0.2,
      max: 3.1,
    },
  });

  // Tweak to accommodate TidyUI's smaller available space.
  if (game.modules.get('tidy-ui_game-settings')?.active) {
    $('.noUi-base').css({
      width: '480px',
    });
    $('#quickscale-random-slider').css({
      transform: 'translate(30px, 5px)',
    });
  }

  slider.noUiSlider.on('change', saveNewRange);
});

// On slider changes, save the new values into the actual inputs.
function saveNewRange(values, handle, unencoded, tap, positions, noUiSlider) {
  $('input[name="quickscale.random-min"]').val(values[0]);
  $('input[name="quickscale.random-max"]').val(values[1]);
}

// Main scaling function.
async function updateSize(key, largeStep) {
  let increase = false;
  if (key == QS_Enlarge_Key || key == QS_Prototype_Key) increase = true;

  // Update controlled tokens.
  await canvas.tokens.updateAll(
    (t) => ({ scale: getNewTokenScale(t.data.scale, increase) }),
    (t) => t._controlled
  );

  // Update controlled tiles.
  const tileUpdates = canvas.background.controlled.map((t) => ({
    _id: t.id,
    width: t.data.width * (increase ? QS_Scale_Up : QS_Scale_Down),
    height: t.data.height * (increase ? QS_Scale_Up : QS_Scale_Down),
  }));
  await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);

  // Update hovered template.
  const hoveredTemplate = canvas.templates._hover?.document;
  if (hoveredTemplate) {
    const currentDistance = hoveredTemplate.data.distance;
    if (largeStep) {
      await hoveredTemplate.update({
        distance: increase ? Math.floor(currentDistance + 5) : Math.ceil(currentDistance - 5),
      });
    } else {
      await hoveredTemplate.update({
        distance: increase ? Math.floor(currentDistance + 1) : Math.ceil(currentDistance - 1),
      });
    }
  }

  // Update hovered light.
  const hoveredLight = canvas.lighting._hover?.document;
  if (hoveredLight) {
    const currentDim = hoveredLight.data.dim;
    const currentBright = hoveredLight.data.bright;
    let newBright = Math.ceil(currentBright - 5);
    if (largeStep) {
      if (Math.ceil(currentDim - 5) > 0 && newBright < 0) {
        newBright = 0;
      }
      await hoveredLight.update({
        dim: increase ? Math.floor(currentDim + 5) : Math.ceil(currentDim - 5),
        bright: increase ? Math.floor(currentBright + 5) : newBright,
      });
    } else {
      newBright = Math.ceil(currentBright - 1);
      if (Math.ceil(currentDim - 1) > 0 && newBright < 0) {
        newBright = 0;
      }
      await hoveredLight.update({
        dim: increase ? Math.floor(currentDim + 1) : Math.ceil(currentDim - 1),
        bright: increase ? Math.floor(currentBright + 1) : newBright,
      });
    }
  }

  // Update hovered sound.
  const hoveredSound = canvas.sounds._hover?.document;
  if (hoveredSound) {
    const currentRadius = hoveredSound.data.radius;
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

// Push current scales to prototypes.
async function updatePrototype() {
  const controlledTokens = canvas.tokens.controlled.map((t) => {
    return {
      actorID: t.data.actorId,
      scale: t.data.scale,
    };
  });

  // Update the base actor data with the instanced tokens' current scales.
  const actorUpdates = controlledTokens.map((entry) => ({
    _id: entry.actorID,
    'token.scale': entry.scale,
  }));
  Actor.updateDocuments(actorUpdates);

  // Fire off an animation for visual feedback.
  const tokens = canvas.tokens.placeables.filter((t) => t._controlled);
  for (let t of tokens) {
    await createAnimation(t.data._id);
  }
}

// Scale randomizer. Pulls from range set in module settings.
async function randomizeScale() {
  // Randomize token scales.
  const tokenUpdates = canvas.tokens.controlled.map((t) => ({
    _id: t.id,
    scale:
      Math.round(
        getRandomArbitrary(
          game.settings.get('quickscale', 'random-min'),
          game.settings.get('quickscale', 'random-max')
        ) * 10
      ) / 10, // Extra math here is for decimal truncation.
  }));
  await canvas.scene.updateEmbeddedDocuments('Token', tokenUpdates);

  // Randomize tile scales.
  const tileUpdates = canvas.background.controlled.map((t) => {
    const randomTileScale = getRandomArbitrary(QS_Scale_Down, QS_Scale_Up);
    return {
      _id: t.id,
      width: t.data.width * randomTileScale,
      height: t.data.height * randomTileScale,
    };
  });
  await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
}

// Rotation randomizer for tiles.
async function randomizeRotation() {
  const rotation = game.settings.get('quickscale', 'rotation-amount');

  // Update controlled tokens.
  await canvas.tokens.updateAll(
    (t) => ({ rotation: t.data.rotation + getRandomArbitrary(0 - rotation, rotation) }),
    (t) => t._controlled
  );

  // Update controlled tiles.
  const tileUpdates = canvas.background.controlled.map((t) => {
    return {
      _id: t.id,
      rotation: t.data.rotation + getRandomArbitrary(0 - rotation, rotation),
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
async function createAnimation(tokenID) {
  const token = canvas.tokens.get(tokenID);
  const animationTexture = await loadTexture(QS_Animation_Path);
  const textureSize = canvas.grid.size + canvas.dimensions.size;
  animationTexture.orig = {
    height: textureSize,
    width: textureSize,
    x: textureSize / 2,
    y: textureSize / 2,
  };
  let sprite = new PIXI.Sprite(animationTexture);
  sprite.anchor.set(0.5);
  let animation = token.addChild(sprite);
  animation.position.x = (canvas.grid.w * token.data.width) / 2;
  animation.position.y = (canvas.grid.h * token.data.height) / 2;
  animation.visible = true;
  const source = getProperty(animation._texture, 'baseTexture.resource.source');
  source.loop = false;
  game.video.play(source);
  setTimeout(() => {
    token.removeChild(sprite);
  }, 1200);
}
