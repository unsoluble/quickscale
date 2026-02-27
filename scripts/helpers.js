export function isAssistantOrHigher() {
  return game.user.role >= CONST.USER_ROLES.ASSISTANT;
}

export function getActiveLayer() {
  return game.canvas?.activeLayer;
}

export function getStepSize(largeStep) {
  return largeStep ? 5 : 1;
}

export function runAsync(action) {
  Promise.resolve()
    .then(action)
    .catch((err) => {
      console.error('QuickScale | Keybind action failed', err);
    });
}

export function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}
