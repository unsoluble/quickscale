import { QS_MODULE_ID, QS_Revert_Animation_Path, QS_Save_Animation_Path, QS_Scale_Down, QS_Scale_Up } from './constants.js';
import { getActiveLayer, getRandomArbitrary, getStepSize, isAssistantOrHigher, isFoundryV14OrNewer } from './helpers.js';

export async function updateSize(action, largeStep) {
  let increase = false;
  if (action == 'scale-up') increase = true;

  const authorized = isAssistantOrHigher();
  const activeLayer = getActiveLayer();
  const step = getStepSize(largeStep);

  if (activeLayer instanceof foundry.canvas.layers.TokenLayer) {
    if (authorized) {
      await canvas.tokens.updateAll(
        (t) => ({
          texture: {
            scaleX: getNewTokenScale(t.document.texture.scaleX, increase),
            scaleY: getNewTokenScale(t.document.texture.scaleY, increase),
          },
        }),
        (t) => t.controlled,
        { animate: false },
      );
      return true;
    }
  } else if (activeLayer instanceof foundry.canvas.layers.TilesLayer) {
    if (authorized) {
      const controlledTiles = canvas.tiles.controlled;
      const tileUpdates = controlledTiles.map((t) => ({
        _id: t.id,
        width: t.document.width * (increase ? QS_Scale_Up : QS_Scale_Down),
        height: t.document.height * (increase ? QS_Scale_Up : QS_Scale_Down),
      }));
      await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
      return true;
    }
  } else if (activeLayer instanceof foundry.canvas.layers.LightingLayer) {
    if (authorized) {
      const hoveredLight = canvas.lighting.hover?.document;
      if (hoveredLight) {
        const currentDim = hoveredLight.config.dim;
        const currentBright = hoveredLight.config.bright;
        await hoveredLight.update({
          'config.dim': increase ? Math.floor(currentDim + step) : Math.max(Math.ceil(currentDim - step), 0),
          'config.bright': increase ? Math.floor(currentBright + step) : Math.max(Math.ceil(currentBright - step), 0),
        });
        return true;
      }
    }
  } else if (activeLayer instanceof foundry.canvas.layers.SoundsLayer) {
    if (authorized) {
      const hoveredSound = canvas.sounds.hover?.document;
      if (hoveredSound) {
        const currentRadius = hoveredSound.radius;
        await hoveredSound.update({
          radius: increase ? Math.floor(currentRadius + step) : Math.max(Math.ceil(currentRadius - step), 0),
        });
        return true;
      }
    }
  } else if (!isFoundryV14OrNewer() && (activeLayer instanceof foundry.canvas.layers.TemplateLayer)) {
    const hoveredTemplate = canvas.templates.hover?.document;
    if (hoveredTemplate) {
      const currentDistance = hoveredTemplate.distance;
      await hoveredTemplate.update({
        distance: increase ? Math.floor(currentDistance + step) : Math.max(Math.ceil(currentDistance - step), 1),
      });
      return true;
    }
  }
  return false;
}

export async function updatePrototype() {
  if (!isAssistantOrHigher()) return false;

  const controlledTokens = canvas.tokens.controlled
    .filter((t) => t.document.actorId)
    .map((t) => {
      return {
        tokenID: t.document._id,
        actorID: t.document.actorId,
        scaleX: t.document.texture.scaleX,
        scaleY: t.document.texture.scaleY,
      };
    });
  if (!controlledTokens.length) return false;

  const actorUpdates = controlledTokens.map((entry) => ({
    _id: entry.actorID,
    'prototypeToken.texture.scaleX': entry.scaleX,
    'prototypeToken.texture.scaleY': entry.scaleY,
  }));
  await Actor.updateDocuments(actorUpdates);

  for (const t of controlledTokens) {
    await createAnimation(true, t.tokenID);
  }
  return true;
}

export async function revertPrototype() {
  if (!isAssistantOrHigher()) return false;

  const controlledTokens = canvas.tokens.controlled.filter((t) => t.document.actor?.prototypeToken?.texture);
  if (!controlledTokens.length) return false;

  await canvas.tokens.updateAll(
    (t) => ({
      texture: {
        scaleX: t.document.actor.prototypeToken.texture.scaleX,
        scaleY: t.document.actor.prototypeToken.texture.scaleY,
      },
    }),
    (t) => t.controlled && !!t.document.actor?.prototypeToken?.texture,
  );

  for (const t of controlledTokens) {
    await createAnimation(false, t.document._id);
  }
  return true;
}

export async function randomizeScale() {
  if (!isAssistantOrHigher()) return false;
  let changed = false;

  if (canvas.tokens.controlled.length > 0) {
    const updates = [];

    for (const tokenDoc of canvas.tokens.controlled) {
      const newScale =
        Math.round(getRandomArbitrary(game.settings.get(QS_MODULE_ID, 'token-random-min'), game.settings.get(QS_MODULE_ID, 'token-random-max')) * 10) / 10;
      updates.push({
        _id: tokenDoc.id,
        texture: {
          scaleX: newScale,
          scaleY: newScale,
        },
      });
    }

    await canvas.scene.updateEmbeddedDocuments('Token', updates, { animate: false });
    changed = true;
  }

  if (canvas.tiles.controlled.length > 0) {
    const tileUpdates = canvas.tiles.controlled.map((t) => {
      const randomTileScale = getRandomArbitrary(game.settings.get(QS_MODULE_ID, 'tile-random-min'), game.settings.get(QS_MODULE_ID, 'tile-random-max'));
      return {
        _id: t.id,
        width: Math.round(t.document.width * randomTileScale),
        height: Math.round(t.document.height * randomTileScale),
      };
    });

    await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
    changed = true;
  }
  return changed;
}

export async function randomizeRotation() {
  if (!isAssistantOrHigher()) return false;
  if (!canvas.tokens.controlled.length && !canvas.tiles.controlled.length) return false;

  const rotation = game.settings.get(QS_MODULE_ID, 'rotation-amount');

  await canvas.tokens.updateAll(
    (t) => ({
      rotation: t.document.lockRotation ? t.document.rotation : Math.round(t.document.rotation + getRandomArbitrary(0 - rotation, rotation)),
    }),
    (t) => t.controlled,
  );

  const tileUpdates = canvas.tiles.controlled.map((t) => {
    return {
      _id: t.id,
      rotation: Math.round(t.document.rotation + getRandomArbitrary(0 - rotation, rotation)),
    };
  });
  await canvas.scene.updateEmbeddedDocuments('Tile', tileUpdates);
  return true;
}

function getNewTokenScale(old, increase) {
  const sign = Math.sign(old);
  let newScale = old;
  if (increase) {
    newScale = Math.min(Math.round((Math.abs(old) + 0.1) * 10) / 10, 10);
  } else {
    newScale = Math.max(Math.round((Math.abs(old) - 0.1) * 10) / 10, 0.3);
  }
  return sign * newScale;
}

async function createAnimation(save, tokenID) {
  const token = canvas.tokens.get(tokenID);
  const animationTexture = await foundry.canvas.loadTexture(save ? QS_Save_Animation_Path : QS_Revert_Animation_Path);
  const textureSize = canvas.grid.size + canvas.dimensions.size;
  const gridWidth = canvas.grid.sizeX ?? canvas.grid.w ?? canvas.grid.size;
  const gridHeight = canvas.grid.sizeY ?? canvas.grid.h ?? canvas.grid.size;
  animationTexture.orig = {
    height: save ? textureSize : textureSize / 2,
    width: save ? textureSize : textureSize / 2,
    x: textureSize / 2,
    y: textureSize / 2,
  };
  const sprite = new PIXI.Sprite(animationTexture);
  sprite.anchor.set(0.5);
  const animation = token.addChild(sprite);
  animation.position.x = (gridWidth * token.document.width) / 2;
  animation.position.y = (gridHeight * token.document.height) / 2;
  animation.visible = true;
  const source = foundry.utils.getProperty(animation._texture, 'baseTexture.resource.source');
  game.video.play(source, { loop: false, offset: 0 });
  setTimeout(
    () => {
      token.removeChild(sprite);
    },
    save ? 1200 : 1800,
  );
}
