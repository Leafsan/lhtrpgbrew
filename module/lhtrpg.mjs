// Import document classes.
import { LHTrpgActor } from "./documents/actor.mjs";
import { LHTrpgItem } from "./documents/item.mjs";
import { LHTrpgCombat } from "./documents/lhtrpgCombat.mjs";
import { LHTrpgActiveEffect } from "./documents/lhtrpgActiveEffect.mjs"
// Import sheet classes.
import { LHTrpgActorSheet } from "./sheets/actor-sheet.mjs";
import { LHTrpgActorMonsterSheet } from "./sheets/actor-monster-sheet.mjs";
import { LHTrpgItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { _createItemsCompendiums, _createSkillsCompendiums } from "./helpers/api-import.mjs";
import { LHTRPG } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {

  console.log(`Log Horizon TRPG | Initializing Half-Gaia Project...\n${LHTRPG.ASCII}`);

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.lhtrpg = {
    LHTrpgActor,
    LHTrpgItem,
    rollItemMacro,
    LHTrpgCombat,
    LHTrpgActiveEffect
  };

  // Add custom constants for configuration.
  CONFIG.LHTRPG = LHTRPG;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "0d6",
    decimals: 0
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = LHTrpgActor;
  CONFIG.Item.documentClass = LHTrpgItem;
  CONFIG.Combat.documentClass = LHTrpgCombat;
  CONFIG.ActiveEffect.documentClass = LHTrpgActiveEffect;
  // By default, track hate and skip defeated combatants
  CONFIG.combatTrackerConfig = {resource: 'infos.hate', skipDefeated: true};
  // Time passing per round
  CONFIG.time.roundTime = 6;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lhtrpg", LHTrpgActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "LHTRPG.PlayerSheet"
  });
  Actors.registerSheet("lhtrpg", LHTrpgActorMonsterSheet, {
    types: ["monster"],
    makeDefault: true,
    label: "LHTRPG.MonsterSheet"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lhtrpg", LHTrpgItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function () {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('toUpperCase', function (str) {
  return str.toUpperCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on("renderCompendiumDirectory", (app, html) => createSkillImportButton(app, html));
Hooks.on("renderCompendiumDirectory", (app, html) => createItemsImportButton(app, html));

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.lhtrpg.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "lhtrpg.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}


function createSkillImportButton(app, html) {
  if (!game.user.isGM) {
    return;
  }
  const button = $(`<button class="buttonImportSkills"><i class="fa-solid fa-book-atlas"></i> ${game.i18n.localize('LHTRPG.Label.ImportSkills')}</button>`);
  button.on('click', () => {
    _createSkillsCompendiums();
  });
  let footer = html.find('.directory-footer');
  if (footer.length === 0) {
    footer = $(`<footer class="directory-footer"></footer>`);
    html.append(footer);
  }
  footer.append(button);
}


function createItemsImportButton(app, html) {
  if (!game.user.isGM) {
    return;
  }
  const button = $(`<button class="buttonImportItems"><i class="fa-solid fa-book-atlas"></i> ${game.i18n.localize('LHTRPG.Label.ImportItems')}</button>`);
  button.on('click', () => {
    _createItemsCompendiums();
  });
  let footer = html.find('.directory-footer');
  if (footer.length === 0) {
    footer = $(`<footer class="directory-footer"></footer>`);
    html.append(footer);
  }
  footer.append(button);
}