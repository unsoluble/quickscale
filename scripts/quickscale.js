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
