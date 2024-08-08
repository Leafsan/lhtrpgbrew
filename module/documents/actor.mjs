/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class LHTrpgActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /**
   * Make adjustments before Character creation, like an actor type default picture
   */
  async _preCreate(createData, options, user) {
    await super._preCreate(createData, options, user);

    // add actor default picture depending on type
    if (this.img === "icons/svg/mystery-man.svg") {
      const updateData = {};
      updateData[
        "img"
      ] = `systems/lhtrpg/assets/ui/actors_icons/${this.type}.svg`;
      await this.updateSource(updateData);
    }
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /** @override */
  applyActiveEffects() {
    // The Active Effects do not have access to their parent at preparation time so we wait until this stage to determine whether they are suppressed or not.
    this.effects.forEach((e) => e.determineSuppression());
    return super.applyActiveEffects();
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const phy = system.attributes.phy;
    const agi = system.attributes.agi;
    const wil = system.attributes.wil;
    const int = system.attributes.int;
    const str = system.attributes.str;
    const end = system.attributes.end;
    const qik = system.attributes.qik;
    const dex = system.attributes.dex;
    const min = system.attributes.min;
    const pre = system.attributes.pre;
    const dis = system.attributes.dis;
    const wis = system.attributes.wis;

    const checks = system.checks;
    const itemlist = actorData.items;
    const flags = actorData.flags.lhtrpg || {};
    let itemNumber = 0;

    if (actorData.type === "character") {
      // Attributes modifiers
      if (system.attributes) {
        for (let [k] of Object.entries(system.attributes)) {
          if (system.attributes[k].mod !== undefined) {
            system.attributes[k].mod = Math.floor(
              system.attributes[k].value / 3
            );
          }
        }
      }

      // Abilities Scores
      this._computeChecks(actorData);

      // Battle statuses
      this._computeBattleStatuses(actorData);

      // Inventory space
      this._computeInventoryMaxSpace(actorData);

      // item count inventory
      itemlist.forEach((item) => {
        if (item.system.equipped !== undefined) {
          if (item.system.equipped == false) {
            itemNumber += 1;
          }
        }
      });
      system.inventory.space = itemNumber;
    }

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== "character" || actorData.type !== "monster") return;

    // Make modifications to data here. For example:
    const data = actorData;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const system = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(system);

    return system;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(system) {
    if (this.type !== "character") return;

    if (system.attributes) {
      for (let [k, v] of Object.entries(system.attributes)) {
        system[k] = foundry.utils.deepClone(v);
      }
    }

    if (system["battle-status"].power) {
      for (let [k, v] of Object.entries(system["battle-status"].power)) {
        system[k] = foundry.utils.deepClone(v);
      }
    }

    system.itemData = {};
    system.skillData = {};

    if (this.items) {
      this.items.forEach(function (key, _id) {
        if (key.type === "skill") {
          system.skillData[key._id] = foundry.utils.deepClone(key.system);
        } else {
          system.itemData[key._id] = foundry.utils.deepClone(key.system);
        }
      });
    }
  }

  /**
   * Autocalc the Abilities/Checks Scores
   * @param actorData
   */
  _computeChecks(actorData) {
    const system = actorData.system;
    const checks = system.checks;
    const phy = system.attributes.phy;
    const agi = system.attributes.agi;
    const wil = system.attributes.wil;
    const int = system.attributes.int;
    const str = system.attributes.str;
    const end = system.attributes.end;
    const qik = system.attributes.qik;
    const dex = system.attributes.dex;
    const min = system.attributes.min;
    const pre = system.attributes.pre;
    const dis = system.attributes.dis;
    const wis = system.attributes.wis;

    // PHY Abilities
    checks.athletics.base = phy.value + str.value ?? 0;
    checks.athletics.total =
      checks.athletics.base + checks.athletics.rank + checks.athletics.mod;

    checks.endurance.base = phy.value + end.value ?? 0;
    checks.endurance.total =
      checks.endurance.base + checks.endurance.rank + checks.endurance.mod;

    // AGI Abilities
    checks.overcome.base = agi.value + qik.value ?? 0;
    checks.overcome.total =
      checks.overcome.base + checks.overcome.rank + checks.overcome.mod;

    checks.operation.base = agi.value + dex.value ?? 0;
    checks.operation.total =
      checks.operation.base + checks.operation.rank + checks.operation.mod;

    // WIL Abilities
    checks.perception.base = wil.value + min.value ?? 0;
    checks.perception.total =
      checks.perception.base + checks.perception.rank + checks.perception.mod;

    checks.negotiation.base = wil.value + pre.value ?? 0;
    checks.negotiation.total =
      checks.negotiation.base +
      checks.negotiation.rank +
      checks.negotiation.mod;

    // checks.resistance.base = pow.mod ?? 0;
    // checks.resistance.total = checks.resistance.base + checks.resistance.mod;

    // INT Abilities
    checks.knowledge.base = int.value + dis.value ?? 0;
    checks.knowledge.total =
      checks.knowledge.base + checks.knowledge.rank + checks.knowledge.mod;

    checks.analysis.base = int.value + wis.value ?? 0;
    checks.analysis.total =
      checks.analysis.base + checks.analysis.rank + checks.analysis.mod;

    // Accuracy

    // Get accuracy bonus from weapons
    let accuBonus = 0;
    // Get equipped weapons
    const { weapons } = actorData.itemTypes.weapon.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.weapons.push(equip);
        return obj;
      },
      { weapons: [] }
    );

    // Only add the accuracy bonus of the weapons if there's 2 or less of them, as that's the equippable limit
    if (weapons.length > 0) {
      if (weapons.length <= 2) {
        for (let [i] of Object.entries(weapons)) {
          accuBonus += weapons[i].system.accuracy ?? 0;
        }
      }
    }

    checks.accuracy.base = agi.value + dex.value ?? 0;
    checks.accuracy.total =
      checks.accuracy.base + accuBonus + checks.accuracy.mod;

    // If any of the dice values goes under 1, get it back to 1.
    for (let [check] of Object.entries(checks)) {
      checks[check].dice = Math.max(checks[check].dice, 1);
    }
  }

  _computeBattleStatuses(actorData) {
    const system = actorData.system;
    const bStatus = system["battle-status"];
    const phy = system.attributes.phy;
    const agi = system.attributes.agi;
    const wil = system.attributes.wil;
    const int = system.attributes.int;
    const str = system.attributes.str;
    const end = system.attributes.end;
    const qik = system.attributes.qik;
    const dex = system.attributes.dex;
    const min = system.attributes.min;
    const pre = system.attributes.pre;
    const dis = system.attributes.dis;
    const wis = system.attributes.wis;

    // Get equipped weapons
    const { weapons } = actorData.itemTypes.weapon.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.weapons.push(equip);
        return obj;
      },
      { weapons: [] }
    );

    // Get equipped armor
    const { armors } = actorData.itemTypes.armor.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.armors.push(equip);
        return obj;
      },
      { armors: [] }
    );

    // Get equipped shield
    const { shields } = actorData.itemTypes.shield.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.shields.push(equip);
        return obj;
      },
      { shields: [] }
    );

    // Get equipped accessories
    const { accessories } = actorData.itemTypes.accessory.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.accessories.push(equip);
        return obj;
      },
      { accessories: [] }
    );

    /**
     * ATTACK, MAGIC, RESTORATION POWER
     */

    let mainWeapon;

    if (weapons.length > 0) {
      mainWeapon = weapons[0];
    }

    // Get the first main weapon if the array has more than one weapon
    if (weapons.length > 1) {
      for (let [i] of Object.entries(weapons)) {
        if (weapons[i].system.main) mainWeapon = weapons[i];
      }
    }

    if (mainWeapon !== undefined) {
      bStatus.power.attack.base = str.value + mainWeapon.system.attack ?? 0;
      bStatus.power.magic.base = dis.value + mainWeapon.system.magic ?? 0;
    } else {
      bStatus.power.attack.base = str.value ?? 0;
      bStatus.power.magic.base = dis.value ?? 0;
    }

    // Get the magic stat from accessories (Magic stones)
    let accBonus = 0;

    if (accessories.length > 0) {
      for (let [i] of Object.entries(accessories)) {
        accBonus += accessories[i].system.magic ?? 0;
      }
    }

    // Assign values to total
    bStatus.power.attack.total =
      bStatus.power.attack.base + (bStatus.power.attack.mod ?? 0);
    bStatus.power.magic.total =
      bStatus.power.magic.base + (bStatus.power.magic.mod ?? 0) + accBonus;
    bStatus.power.restoration.total = bStatus.power.restoration.mod ?? 0;

    /**
     * DEFENSES
     */

    let pDefBonus = 0;
    let mDefBonus = 0;

    bStatus.defense.phys.base = str.mod * 2 ?? 0;
    bStatus.defense.magic.base = int.mod * 2 ?? 0;

    // Since only one armor can be equipped at a time, only return the first in the array
    if (armors.length > 0) {
      pDefBonus += armors[0].system.pdef ?? 0;
      mDefBonus += armors[0].system.mdef ?? 0;
    }

    if (shields.length > 0) {
      for (let [i] of Object.entries(shields)) {
        pDefBonus += shields[i].system.pdef ?? 0;
        mDefBonus += shields[i].system.mdef ?? 0;
      }
    }
    // Only add the defenses of the accessories if there's 3 or less of them, as that's the equippable limit
    if (accessories.length > 0) {
      if (accessories.length <= 3) {
        for (let [i] of Object.entries(accessories)) {
          pDefBonus += accessories[i].system.pdef ?? 0;
          mDefBonus += accessories[i].system.mdef ?? 0;
        }
      }
    }

    // Assign values to total
    bStatus.defense.phys.total =
      bStatus.defense.phys.base + bStatus.defense.phys.mod + pDefBonus ?? 0;
    bStatus.defense.magic.total =
      bStatus.defense.magic.base + bStatus.defense.magic.mod + mDefBonus ?? 0;

    /**
     * SPEED/MOVEMENT
     */

    bStatus.speed.base = 2;
    bStatus.speed.total = bStatus.speed.base + (bStatus.speed.mod ?? 0);

    /**
     * INITIATIVE
     */

    let initBonus = 0;

    bStatus.initiative.base = str.mod + int.mod ?? 0;

    // Only add the initiative bonus of the weapons if there's 2 or less of them, as that's the equippable limit
    if (weapons.length > 0) {
      if (weapons.length <= 2) {
        for (let [i] of Object.entries(weapons)) {
          initBonus += weapons[i].system.initiative ?? 0;
        }
      }
    }

    // Since only one armor can be equipped at a time, only return the first in the array
    if (armors.length > 0) {
      initBonus += armors[0].system.initiative ?? 0;
    }

    // Only add the initiative bonus of the accessories if there's 3 or less of them, as that's the equippable limit
    if (accessories.length > 0) {
      if (accessories.length <= 3) {
        for (let [i] of Object.entries(accessories)) {
          initBonus += accessories[i].system.initiative ?? 0;
        }
      }
    }

    let initTotal =
      bStatus.initiative.base + initBonus + bStatus.initiative.mod ?? 0;

    // If the initiative goes under zero, it's equal to zero
    bStatus.initiative.total = Math.max(initTotal, 0);
  }

  _computeInventoryMaxSpace(actorData) {
    const system = actorData.system;
    const inventory = system.inventory;

    inventory.base = 2;
    let bonusBagSpace = 0;
    // Get equipped bags
    const { bags } = actorData.itemTypes.bag.reduce(
      (obj, equip) => {
        if (!equip.system.equipped) return obj;
        else obj.bags.push(equip);
        return obj;
      },
      { bags: [] }
    );

    if (bags.length > 0) {
      for (let [i] of Object.entries(bags)) {
        bonusBagSpace += bags[i].system.bagSpace ?? 0;
      }
    }

    inventory.maxSpace =
      inventory.base + (inventory.mod ?? 0) + (bonusBagSpace ?? 0);
  }
}
