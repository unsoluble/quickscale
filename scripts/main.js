import { registerKeyBindings } from './keybindings.js';
import { registerDefaultSettings, registerSettingsHooks } from './settings.js';

registerSettingsHooks();

Hooks.on('init', function () {
  registerDefaultSettings();
  registerKeyBindings();
});
