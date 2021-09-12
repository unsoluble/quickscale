// Keybinds.
const QS_Reduce_Key = '-';
const QS_Enlarge_Key = '=';
const QS_Randomize_Key = '_';
const QS_Prototype_Key = '+';

// Animation provided by @Jinker — https://www.patreon.com/jinker
const QS_Animation_Path = 'modules/quickscale/assets/spinburst2.webm';

// Make a setting for these, probably.
const QS_Random_Floor = 0.8;
const QS_Random_Ceiling = 1.2;

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

  game.settings.register('quickscale', 'random-label', {
    name: 'Randomization Range',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  /*
  
  game.settings.register('quickscale', 'enlarge-key', {
    scope: 'world',
    config: false,
    type: String,
    default: '=',
  });
  
  if (game.modules.get('lib-df-hotkeys')?.active) {
    hotkeys.registerGroup({
      name: 'quickscale.my-group',
      label: 'My Awesome Group',
      description: 'Optional description goes here',
    });

    hotkeys.registerShortcut({
      name: 'quickscale.enlarge-key',
      label: 'My Hotkey',
      group: 'quickscale.my-group',
      get: () => game.settings.get('quickscale', 'enlarge-key'),
      set: async (value) => await game.settings.set('quickscale', 'enlarge-key', value),
      default: () => {
        return { key: hotkeys.keys.KeyQ, alt: false, ctrl: false, shift: false };
      },
      onKeyDown: (self) => {
        console.log('You hit my custom hotkey!');
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
      updateSize(e.key);
    }
    if (e.key == QS_Prototype_Key) {
      updatePrototype();
    }
    if (e.key == QS_Randomize_Key) {
      randomize();
    }
  });
});

Hooks.on('renderSettingsConfig', () => {
  $('input[name="quickscale.random-min"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.random-max"]').parent().parent().css('display', 'none');
  $('input[name="quickscale.random-label"]').css('display', 'none');

  const insertionElement = $('input[name="quickscale.random-label"]').parent().next();

  const injection = `<div id="quickscale-random-slider"></div>`;

  // Only inject if it isn't already there.
  if (!$('#quickscale-random-slider').length) {
    insertionElement.after(injection);
  }

  const slider = document.getElementById('quickscale-random-slider');

  noUiSlider.create(slider, {
    start: [0.7, 1.2],
    tooltips: [wNumb({ decimals: 1 }), wNumb({ decimals: 1 })],
    step: 0.1,
    margin: 0.1,
    padding: 0.1,
    connect: true,
    range: {
      min: 0.2,
      max: 3.1,
    },
  });

  mergeTooltips(slider, 5, ' - ');
});

async function updateSize(key) {
  let increase = false;
  if (key == QS_Enlarge_Key) increase = true;
  await canvas.tokens.updateAll(
    (t) => ({ scale: getNewScale(t.data.scale, increase) }),
    (t) => t._controlled
  );
}

async function updatePrototype() {
  // Map the controlled tokens.
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

async function randomize() {
  const updates = canvas.tokens.controlled.map((t) => ({
    _id: t.id,
    scale: Math.round(getRandomArbitrary(QS_Random_Floor, QS_Random_Ceiling) * 10) / 10,
  }));
  await canvas.scene.updateEmbeddedDocuments('Token', updates);
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getNewScale(old, increase) {
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

function mergeTooltips(slider, threshold, separator) {
  var textIsRtl = getComputedStyle(slider).direction === 'rtl';
  var isRtl = slider.noUiSlider.options.direction === 'rtl';
  var isVertical = slider.noUiSlider.options.orientation === 'vertical';
  var tooltips = slider.noUiSlider.getTooltips();
  var origins = slider.noUiSlider.getOrigins();

  // Move tooltips into the origin element. The default stylesheet handles this.
  tooltips.forEach(function (tooltip, index) {
    if (tooltip) {
      origins[index].appendChild(tooltip);
    }
  });

  slider.noUiSlider.on('update', function (values, handle, unencoded, tap, positions) {
    var pools = [[]];
    var poolPositions = [[]];
    var poolValues = [[]];
    var atPool = 0;

    // Assign the first tooltip to the first pool, if the tooltip is configured
    if (tooltips[0]) {
      pools[0][0] = 0;
      poolPositions[0][0] = positions[0];
      poolValues[0][0] = values[0];
    }

    for (var i = 1; i < positions.length; i++) {
      if (!tooltips[i] || positions[i] - positions[i - 1] > threshold) {
        atPool++;
        pools[atPool] = [];
        poolValues[atPool] = [];
        poolPositions[atPool] = [];
      }

      if (tooltips[i]) {
        pools[atPool].push(i);
        poolValues[atPool].push(values[i]);
        poolPositions[atPool].push(positions[i]);
      }
    }

    pools.forEach(function (pool, poolIndex) {
      var handlesInPool = pool.length;

      for (var j = 0; j < handlesInPool; j++) {
        var handleNumber = pool[j];

        if (j === handlesInPool - 1) {
          var offset = 0;

          poolPositions[poolIndex].forEach(function (value) {
            offset += 1000 - 10 * value;
          });

          var direction = isVertical ? 'bottom' : 'right';
          var last = isRtl ? 0 : handlesInPool - 1;
          var lastOffset = 1000 - 10 * poolPositions[poolIndex][last];
          offset = (textIsRtl && !isVertical ? 100 : 0) + offset / handlesInPool - lastOffset;

          // Center this tooltip over the affected handles
          tooltips[handleNumber].innerHTML = poolValues[poolIndex].join(separator);
          tooltips[handleNumber].style.display = 'block';
          tooltips[handleNumber].style[direction] = offset + '%';
        } else {
          // Hide this tooltip
          tooltips[handleNumber].style.display = 'none';
        }
      }
    });
  });
}
