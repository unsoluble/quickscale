const QS_Reduce_Key = '-';
const QS_Enlarge_Key = '=';

Hooks.on('ready', () => {
  window.addEventListener('keypress', (e) => {
    if (document.activeElement instanceof HTMLInputElement) return;
    if (document.activeElement instanceof HTMLTextAreaElement) return;
    if (document.activeElement.getAttribute('contenteditable') === 'true') return;
    if (!game.user.isGM) return;

    if (e.key == QS_Reduce_Key || e.key == QS_Enlarge_Key) {
      updateSize(e.key);
    }
    if (e.key == '+') {
      updatePrototype();
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
  const ids = canvas.tokens.controlled.map((i) => i.id);
  await game.actors.updateAll({ 'token.scale': 2.0 }, (a) => ids.includes(a.id));
}

function getNewScale(old, increase) {
  let newScale = old;
  if (increase) {
    newScale = Math.min(Math.round((old + 0.1) * 10) / 10, 10);
  } else {
    newScale = Math.max(Math.round((old - 0.1) * 10) / 10, 0.3);
  }
  return newScale;
}
