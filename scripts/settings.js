import { QS_MODULE_ID } from './constants.js';
import { isAssistantOrHigher } from './helpers.js';

export async function registerDefaultSettings() {
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
    game.settings.register(QS_MODULE_ID, setting.id, {
      name: setting.name,
      hint: setting.hint,
      scope: 'world',
      config: true,
      type: setting.type,
      default: setting.default,
    });
  }
}

export function registerSettingsHooks() {
  Hooks.on('renderSettingsConfig', (_app, html) => {
    if (!isAssistantOrHigher()) return;

    const root = html instanceof jQuery ? html : $(html);
    const tokenMinInput = root.find(`input[name="${QS_MODULE_ID}.token-random-min"]`);
    const tokenMaxInput = root.find(`input[name="${QS_MODULE_ID}.token-random-max"]`);
    const tokenLabelInput = root.find(`input[name="${QS_MODULE_ID}.token-random-label"]`);
    const tileMinInput = root.find(`input[name="${QS_MODULE_ID}.tile-random-min"]`);
    const tileMaxInput = root.find(`input[name="${QS_MODULE_ID}.tile-random-max"]`);
    const tileLabelInput = root.find(`input[name="${QS_MODULE_ID}.tile-random-label"]`);

    tokenMinInput.closest('.form-group').hide();
    tokenMaxInput.closest('.form-group').hide();
    tileMinInput.closest('.form-group').hide();
    tileMaxInput.closest('.form-group').hide();

    tokenLabelInput.hide();
    tileLabelInput.hide();

    const tokenFields = tokenLabelInput.closest('.form-group').find('.form-fields').first();
    const tileFields = tileLabelInput.closest('.form-group').find('.form-fields').first();

    if (!tokenFields.find('#quickscale-token-slider').length) {
      tokenFields.append('<div id="quickscale-token-slider"></div>');
    }
    if (!tileFields.find('#quickscale-tile-slider').length) {
      tileFields.append('<div id="quickscale-tile-slider"></div>');
    }

    const tokenSlider = tokenFields.find('#quickscale-token-slider')[0];
    if (tokenSlider && !tokenSlider.noUiSlider) {
      noUiSlider.create(tokenSlider, {
        start: [game.settings.get(QS_MODULE_ID, 'token-random-min'), game.settings.get(QS_MODULE_ID, 'token-random-max')],
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
    }

    const tileSlider = tileFields.find('#quickscale-tile-slider')[0];
    if (tileSlider && !tileSlider.noUiSlider) {
      noUiSlider.create(tileSlider, {
        start: [game.settings.get(QS_MODULE_ID, 'tile-random-min'), game.settings.get(QS_MODULE_ID, 'tile-random-max')],
        tooltips: [wNumb({ decimals: 1 }), wNumb({ decimals: 1 })],
        behaviour: 'drag-all',
        step: 0.1,
        margin: 0.1,
        padding: 0.1,
        connect: true,
        range: {
          min: 0.4,
          max: 1.6,
        },
      });
    }

    if (tokenSlider?.noUiSlider) {
      tokenSlider.noUiSlider.off('change', saveTokenRange);
      tokenSlider.noUiSlider.on('change', saveTokenRange);
    }
    if (tileSlider?.noUiSlider) {
      tileSlider.noUiSlider.off('change', saveTileRange);
      tileSlider.noUiSlider.on('change', saveTileRange);
    }
  });
}

function saveTokenRange(values) {
  $(`input[name="${QS_MODULE_ID}.token-random-min"]`).val(values[0]);
  $(`input[name="${QS_MODULE_ID}.token-random-max"]`).val(values[1]);
}

function saveTileRange(values) {
  $(`input[name="${QS_MODULE_ID}.tile-random-min"]`).val(values[0]);
  $(`input[name="${QS_MODULE_ID}.tile-random-max"]`).val(values[1]);
}
