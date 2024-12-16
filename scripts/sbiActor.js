import { sbiUtils as sUtils } from "./sbiUtils.js";
import { Blocks } from "./sbiData.js";

export class sbiActor {
    #dnd5e = {};

    constructor(name) {
        this.name = name;                           // string
        this.actions = [];                          // NameValueData[]
        this.armor = null;                          // ArmorData
        this.abilities = [];                        // NameValueData[]
        this.alignment = null;                      // string
        this.bonusActions = [];                     // NameValueData[]
        this.challenge = null;                      // ChallengeData
        this.features = [];                         // NameValueData[]
        this.health = null;                         // RollData
        this.language = null;                       // LanguageData
        this.lairActions = [];                      // NameValueData[]
        this.legendaryActions = [];                 // NameValueData[]
        this.mythicActions = [];                    // NameValueData[]
        this.reactions = [];                        // NameValueData[]
        this.role = null;                           // string                    (MCDM)
        this.savingThrows = [];                     // string[]
        this.senses = [];                           // NameValueData[]
        this.specialSense = null;                   // string
        this.skills = [];                           // NameValueData[]
        this.speeds = [];                           // NameValueData[]
        this.spellcasting = {};                     // {object, NameValueData[]}
        this.innateSpellcasting = {};               // {object, NameValueData[]}
        this.size = null;                           // string
        this.souls = null;                          // RollData
        this.race = null;                           // string
        this.type = null;                           // string
        this.utilitySpells = {};                    // {object, NameValueData[]} (MCDM)
        this.villainActions = [];                   // NameValueData[]           (MCDM)
        this.standardConditionImmunities = [];      // string[]
        this.standardDamageImmunities = [];         // string[]
        this.standardDamageResistances = [];        // string[]
        this.standardDamageVulnerabilities = [];    // string[]
        this.specialConditionImmunities = null;     // string
        this.specialDamageImmunities = null;        // string
        this.specialDamageResistances = null;       // string
        this.specialDamageVulnerabilities = null;   // string
    }

    get actorData() {
        return this.#dnd5e;
    }

    async updateActorData() {
        this.setAbilities();
        this.setChallenge();
        await this.setSpells();
        await this.setActions();
        await this.setMajorActions(Blocks.legendaryActions.id);
        await this.setMajorActions(Blocks.lairActions.id);
        await this.setMajorActions(Blocks.villainActions.id);
        await this.setMinorActions(Blocks.bonusActions.id);
        await this.setMinorActions(Blocks.reactions.id);
        await this.setArmor();
        this.setDamagesAndConditions();
        await this.setFeatures();
        this.setHealth();
        this.setLanguages();
        this.setRacialDetails();
        this.setRole();
        this.setSavingThrows();
        this.setSenses();
        this.setSpeed();
        this.setSouls();
    }

    set5eProperty(path, value) {
        return foundry.utils.setProperty(this.#dnd5e, path, value);
    }

    addItem(itemObject) {
        if (typeof this.#dnd5e.items === "undefined") {
            this.#dnd5e.items = [];
        }
        this.#dnd5e.items.push(itemObject);
    }

    /*** Actions */

    async setActions() {
        for (const actionData of this.actions) {
            const name = actionData.name;
            const lowerName = name.toLowerCase();
            const description = sUtils.combineSourceLines(actionData.value.lines);

            const itemData = {};
            itemData.name = sUtils.capitalizeAll(name);
            itemData.type = "feat";

            foundry.utils.setProperty(itemData, "system.description.value", description);

            // The "Multiattack" action isn't a real action, so there's nothing more to add to it.
            if (lowerName !== "multiattack") {
                // We'll assume that an NPC with stuff will have that stuff identified, equipped, attuned, etc.
                foundry.utils.setProperty(itemData, "system.identified", true);
                foundry.utils.setProperty(itemData, "system.equipped", true);
                foundry.utils.setProperty(itemData, "system.attunement", 2);
                foundry.utils.setProperty(itemData, "system.proficient", true);
                foundry.utils.setProperty(itemData, "system.quantity", 1);
            }
            
            this.setAttackOrSave(actionData, itemData);

            if (Object.keys(itemData.system.activities ?? {}).length === 0) {
                let activityId = foundry.utils.randomID();
                foundry.utils.setProperty(itemData, `system.activities.${activityId}`, {_id: activityId, type: "utility", activation: {type: "action", value: 1}});
            }

            this.setPerDay(actionData, itemData);
            this.setRecharge(actionData, itemData);
            this.setTarget(actionData, itemData);

            if (actionData.value.spell) {
                itemData.type = "spell";
                foundry.utils.setProperty(itemData, "system.preparation.mode", "innate");
                foundry.utils.setProperty(itemData, "system.level", actionData.value.spell.level);
                foundry.utils.setProperty(itemData, "system.properties", ["concentration"]);
            }

            const matchingImage = await sUtils.getImgFromPackItemAsync(itemData.name.toLowerCase());
            if (matchingImage) itemData.img = matchingImage;

            this.addItem(itemData);
        }
    }

    // These are things like legendary, mythic, and lair actions
    async setMajorActions(type) {
        // Set the type of action this is.
        let activationType = "";
        const isLegendaryTypeAction = type === Blocks.legendaryActions.id || type === Blocks.villainActions.id;

        if (isLegendaryTypeAction) {
            activationType = "legendary";
        }

        // Create the items for each action.
        for (const actionData of this[type]) {
            const actionName = actionData.name;
            const description = sUtils.combineSourceLines(actionData.value.lines, actionData.name !== "Description");

            const itemData = {};
            itemData.name = actionName;
            itemData.type = "feat";

            foundry.utils.setProperty(itemData, "system.description.value", description);

            if (actionName === "Description") {
                itemData.name = sUtils.camelToTitleCase(type);
                // Add these just so that it doesn't say the action is not equipped and not proficient in the UI.
                foundry.utils.setProperty(itemData, "system.equipped", true);
                foundry.utils.setProperty(itemData, "system.proficient", true);

                // Determine whether this is a legendary or lair action.
                if (type === Blocks.lairActions.id) {
                    // Lair actions don't use titles, so it's just one item with all actions included in the description text.
                    // Because of that, we need to assign the type here instead of in the 'else' block below.
                    let activityId = foundry.utils.randomID();
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}`, {
                        _id: activityId, type: "utility",
                        activation: {type: "lair"}
                    });

                    const lairInitiativeCount = actionData.value.lairInitiativeCount;
                    if (lairInitiativeCount) {
                        this.set5eProperty("system.resources.lair.value", true);
                        this.set5eProperty("system.resources.lair.initiative", lairInitiativeCount);
                    }
                } else if (isLegendaryTypeAction) {
                    const actionCount = actionData.value.legendaryActionCount || 3;
                    
                    this.set5eProperty("system.resources.legact.value", actionCount);
                    this.set5eProperty("system.resources.legact.max", actionCount);
                }
            } else {
                itemData.name = actionName;
                foundry.utils.setProperty(itemData, "system.activation.type", activationType);

                let actionCost = actionData.value.actionCost || 1;

                this.setAttackOrSave(actionData, itemData);
                this.setRecharge(actionData, itemData);
                
                if (Object.keys(itemData.system.activities ?? {}).length == 0) {
                    let activityId = foundry.utils.randomID();
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}`, {_id: activityId, type: "utility", activation: {type: "action", value: 1}});
                }

                for (let activityId in itemData.system.activities) {
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.activation`, {type: "legendary", value: actionCost});
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.consumption`, {
                        targets: [{
                            type: "attribute",
                            target: "resources.legact.value",
                            value: actionCost
                        }]
                    });
                }
            }

            const matchingImage = await sUtils.getImgFromPackItemAsync(itemData.name.toLowerCase());
            if (matchingImage) itemData.img = matchingImage;

            this.addItem(itemData);
        }
    }

    // These are things like bonus actions and reactions.
    async setMinorActions(type) {
        for (const actionData of this[type]) {
            const name = actionData.name;
            const description = sUtils.combineSourceLines(actionData.value.lines);

            const itemData = {};
            itemData.name = sUtils.capitalizeAll(name);
            itemData.type = "feat";

            foundry.utils.setProperty(itemData, "system.description.value", description);
            this.setAttackOrSave(actionData, itemData);

            let activationType = null;

            if (type == Blocks.bonusActions.id) {
                activationType = "bonus";
            } else if (type === Blocks.reactions.id) {
                activationType = "reaction";
            }

            if (Object.keys(itemData.system.activities ?? {}).length == 0) {
                let activityId = foundry.utils.randomID();
                foundry.utils.setProperty(itemData, `system.activities.${activityId}`, {_id: activityId, type: "utility"});
            }

            for (let activityId in itemData.system.activities) {
                foundry.utils.setProperty(itemData, `system.activities.${activityId}.activation`, {type: activationType});
            }

            this.setPerDay(actionData, itemData);
            this.setRecharge(actionData, itemData);

            const matchingImage = await sUtils.getImgFromPackItemAsync(itemData.name.toLowerCase());
            if (matchingImage) itemData.img = matchingImage;

            this.addItem(itemData);
        }
    }

    setAttackOrSave(actionData, itemData) {
        let attackActivityId, saveActivityId;

        if (actionData.value.attack) {
            itemData.type = "weapon";

            attackActivityId = foundry.utils.randomID();
            foundry.utils.setProperty(itemData, "system.type.value", "natural");
            foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}`, {
                _id: attackActivityId, type: "attack", activation: {type: "action", value: 1},
                attack: {ability: sUtils.getAbilityMod(this.#dnd5e.system.abilities.str.value) > sUtils.getAbilityMod(this.#dnd5e.system.abilities.dex.value) ? "str" : "dex"}
            });

            this.setReach(actionData, itemData);
            this.setRange(actionData, itemData);

            // Some monsters have attacks where the hit bonus doesn't match the modifier. That includes rarer cases of spell attacks on creatures without a spellcasting feature.
            let attackAbility = itemData.system.activities[attackActivityId].attack.ability;
            if (attackAbility === "spellcasting") {
                attackAbility = this.#dnd5e.system.attributes?.spellcasting;
            }
            const attackAbilityValue = this.#dnd5e.system.abilities[attackAbility]?.value || 10;
            const calculatedToHit = sUtils.getAbilityMod(attackAbilityValue) + sUtils.getProficiencyBonus(this.#dnd5e.system.details.cr);
            if (calculatedToHit != actionData.value.attack.toHit) {
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.flat`, true);
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.bonus`, parseInt(actionData.value.attack.toHit));
            }
        }

        if (actionData.value.save) {
            saveActivityId = foundry.utils.randomID();
            foundry.utils.setProperty(itemData, `system.activities.${saveActivityId}`, {_id: saveActivityId, type: "save", activation: {type: "action", value: 1}});
            foundry.utils.setProperty(itemData, `system.activities.${saveActivityId}.damage.onSave`, actionData.value.save.damageOnSave);
            foundry.utils.setProperty(itemData, `system.activities.${saveActivityId}.save`, {ability: sUtils.convertToShortAbility(actionData.value.save.ability), dc: {formula: parseInt(actionData.value.save.dc)}});
        }

        if ((actionData.value.attack || actionData.value.save) && actionData.value.damage) {
            this.setDamageRolls(actionData.value.attack ? "attack" : "save", actionData, itemData);
        }
    }

    setDamageRolls(activity, actionData, itemData) {
        let activityId = Object.values(itemData.system.activities).find(a => a.type == activity)._id;

        const damageParts = [];

        const {damageRoll, damageType, damageMod, plusDamageRoll, plusDamageType, plusDamageMod} = actionData.value.damage;
        const hasDamageMod = !!damageMod;

        if (damageRoll && damageType) {
            let damagePart;
            if (damageRoll.includes("d")) {
                damagePart = {
                    number: parseInt(damageRoll.split("d")[0]),
                    denomination: parseInt(damageRoll.split("d")[1]),
                    types: [damageType]
                };
            } else {
                damagePart = {
                    custom: {enabled: true, formula: damageRoll},
                    types: [damageType]
                }
            }
            if (activity === "attack" && hasDamageMod) {
                // Some monsters have attacks where the damage doesn't match the modifier.
                let attackAbility = itemData.system.activities[activityId].attack.ability;
                if (attackAbility === "spellcasting") {
                    attackAbility = this.#dnd5e.system.attributes?.spellcasting;
                }
                const attackAbilityValue = this.#dnd5e.system.abilities[attackAbility]?.value || 10;
                const abilityMod = sUtils.getAbilityMod(attackAbilityValue);
                if (damageMod != abilityMod) {
                    const diff = damageMod - abilityMod;
                    damagePart.bonus = "@mod " + (diff > 0 ? "+" : "-") + Math.abs(diff);
                }
            }
            if (activity === "save" && hasDamageMod) {
                damagePart.bonus = damageMod;
            }
            damageParts.push(damagePart);
        }

        if (plusDamageRoll && plusDamageType) {
            if (plusDamageRoll.includes("d")) {
                damageParts.push({
                    number: parseInt(plusDamageRoll.split("d")[0]),
                    denomination: parseInt(plusDamageRoll.split("d")[1]),
                    types: [plusDamageType]
                });
            } else {
                damageParts.push({
                    custom: {enabled: true, formula: plusDamageRoll},
                    types: [plusDamageType]
                });
            }
        }

        foundry.utils.setProperty(itemData, `system.damage.base`, damageParts[0]);
        foundry.utils.setProperty(itemData, `system.activities.${activityId}.damage.parts`, []);
        // For spell attacks: we don't include the base damage and we just re-add it in the activity, because we don't want the automatic + @mod
        if (activity === "attack" && actionData.value.type === "spell") {
            foundry.utils.setProperty(itemData, `system.activities.${activityId}.damage.includeBase`, false);
            itemData.system.activities[activityId].damage.parts.push(damageParts[0]);
        }
        // Saves don't have base damage, so we add it here
        if (activity === "save") {
            itemData.system.activities[activityId].damage.parts.push(damageParts[0]);
        }
        // Then the additional part
        if (damageParts.length > 1) {
            itemData.system.activities[activityId].damage.parts.push(damageParts[1]);
        }

        if (actionData.value.damage.versatile) {
            itemData.system.damage.versatile = versatilematch.groups.damageRoll;
            if (itemData.system.properties) {
                itemData.system.properties.ver = true;
            }
        }
    }

    async setFeatures() {
        for (const featureData of this.features) {
            const name = featureData.name;
            const nameLower = name.toLowerCase();
            const description = sUtils.combineSourceLines(featureData.value.lines);
            const itemData = {};

            itemData.name = sUtils.capitalizeAll(name);
            itemData.type = "feat";

            foundry.utils.setProperty(itemData, "system.description.value", description);
            this.setAttackOrSave(featureData, itemData);

            if (nameLower.startsWith("legendary resistance")) {
                let activityId = foundry.utils.randomID();
                if (featureData.value.legendaryResistanceCount) {
                    this.set5eProperty("system.resources.legres.value", featureData.value.legendaryResistanceCount);
                    this.set5eProperty("system.resources.legres.max", featureData.value.legendaryResistanceCount);
                }

                foundry.utils.setProperty(itemData, `system.activities.${activityId}`, {
                    type: "utility",
                    activation: {type: "special"},
                    consumption: {
                        targets: [{
                            type: "attribute",
                            target: "resources.legres.value",
                            value: 1
                        }]
                    },
                });
            } else {
                this.setPerDay(featureData, itemData);
                if (itemData.system.uses?.max || featureData.value.attack || featureData.value.save) {
                    for (let activityId in itemData.system.activities) {
                        foundry.utils.setProperty(itemData, `system.activities.${activityId}.activation`, {type: "special"});
                    }
                }
            }

            const matchingImage = await sUtils.getImgFromPackItemAsync(itemData.name.toLowerCase());
            if (matchingImage) itemData.img = matchingImage;

            this.addItem(itemData);
        }
    }

    setPerDay(actionData, itemData) {
        if (actionData.value.perDay) {
            foundry.utils.setProperty(itemData, "system.uses.max", actionData.value.perDay);
            foundry.utils.setProperty(itemData, "system.uses.recovery", [{period: "day", type: "recoverAll"}]);
        }
    }

    setRange(actionData, itemData) {
        if (actionData.value.range) {
            foundry.utils.setProperty(itemData, "system.range.value", actionData.value.range.near);
            foundry.utils.setProperty(itemData, "system.range.long", actionData.value.range.far);
            foundry.utils.setProperty(itemData, "system.range.units", "ft");
            
            let attackActivityId = Object.values(itemData.system.activities).find(a => a.type == "attack")._id;
            foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.ability`, "dex");
            foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.type.value`, "ranged");

            if (actionData.value.type === "spell") {
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.type.classification`, "spell");
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.ability`, "spellcasting");
            }
        }
    }

    setReach(actionData, itemData) {
        if (actionData.value.reach) {
            foundry.utils.setProperty(itemData, "system.range.value", actionData.value.reach);
            foundry.utils.setProperty(itemData, "system.range.units", "ft");

            let attackActivityId = Object.values(itemData.system.activities).find(a => a.type == "attack")._id;
            foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.ability`, "str");
            foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.type.value`, "melee");

            if (actionData.value.type === "spell") {
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.type.classification`, "spell");
                foundry.utils.setProperty(itemData, `system.activities.${attackActivityId}.attack.ability`, "spellcasting");
            }
        }
    }

    setRecharge(actionData, itemData) {
        if (actionData.value.recharge) {
            foundry.utils.setProperty(itemData, "system.uses", {max: "1", recovery: [{period: "recharge", formula: actionData.value.recharge}]});
        }
    }

    setTarget(actionData, itemData) {
        if (actionData.value.target) {
            let activityId = Object.values(itemData.system.activities).find(a => a.type == "save")?._id;
            if (!activityId) {
                activityId = Object.values(itemData.system.activities)[0]?._id;
            }
            if (activityId) {
                if (actionData.value.target.shape) {
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.target.template.size`, actionData.value.target.range);
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.target.template.type`, actionData.value.target.shape);
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.target.template.units`, "ft");
                } else {
                    // We set these on the item first, then on the activity. One of the two will most likely be discarded but it works.
                    foundry.utils.setProperty(itemData, "system.target.affects.type", actionData.value.target.type);
                    foundry.utils.setProperty(itemData, "system.target.affects.count", actionData.value.target.amount);
                    foundry.utils.setProperty(itemData, "system.range.value", actionData.value.target.range);
                    foundry.utils.setProperty(itemData, "system.range.units", "ft");

                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.target.affects.type`, actionData.value.target.type);
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.target.affects.count`, actionData.value.target.amount);
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.range.value`, actionData.value.target.range);
                    foundry.utils.setProperty(itemData, `system.activities.${activityId}.range.units`, "ft");
                }
            }
        }
    }

    /*** Other Stats */

    setAbilities() {
        for (const data of this.abilities) {
            const propPath = `system.abilities.${data.name.toLowerCase()}.value`;
            this.set5eProperty(propPath, parseInt(data.value));
        }
    }

    async setArmor() {
        let foundArmorItems = false;

        for (const armorType of this.armor.types) {
            if (armorType.toLowerCase() === "natural armor") {
                this.set5eProperty("system.attributes.ac.calc", "natural");
                this.set5eProperty("system.attributes.ac.flat", this.armor.ac);

                foundArmorItems = true;
            } else {
                let item;
                item = await sUtils.getItemFromPacksAsync(armorType, "equipment");
                if (!item) {
                    item = await sUtils.getItemFromPacksAsync(`${armorType} armor`, "equipment");
                }
                if (item) {
                    item.system.equipped = true;
                    item.system.proficient = true;
                    item.system.attunement = 2;
                    
                    this.addItem(item);

                    foundArmorItems = true;
                }
            }
        }

        if (!foundArmorItems) {
            this.set5eProperty("system.attributes.ac.calc", "flat");
            this.set5eProperty("system.attributes.ac.flat", this.armor.ac);
        }
    }

    setChallenge() {
        if (!this.challenge) return;
        this.set5eProperty("system.details.cr", this.challenge.cr);
    }

    setDamagesAndConditions() {
        if (this.standardConditionImmunities.length) {
            this.set5eProperty("system.traits.ci.value", this.standardConditionImmunities);
        }

        if (this.specialConditionImmunities) {
            foundry.utils.setProperty(actorObject, "system.traits.ci.custom", sUtils.capitalizeFirstLetter(this.specialConditionImmunities))
        }

        this.setDamageData(this.standardDamageImmunities, this.specialDamageImmunities, "di");
        this.setDamageData(this.standardDamageResistances, this.specialDamageResistances, "dr");
        this.setDamageData(this.standardDamageVulnerabilities, this.specialDamageVulnerabilities, "dv");
    }

    async createActor5e(selectedFolderId) {
        await this.updateActorData();

        const actorData = foundry.utils.deepClone(this.#dnd5e);
        actorData.folder = selectedFolderId;
        actorData.name = this.name;
        actorData.type = "npc";
        const actor5e = await CONFIG.Actor.documentClass.create(actorData);
        
        await this.setSkills(actor5e);

        return actor5e;
    }

    setDamageData(standardDamages, specialDamage, damageID) {
        if (standardDamages.length) {
            this.set5eProperty(`system.traits.${damageID}.value`, standardDamages);
        }

        if (specialDamage) {
            const specialDamagesLower = specialDamage.toLowerCase();

            // "mundane attacks" is an MCDM thing.
            if (specialDamagesLower.match(/nonmagical\sweapons/i)
                || specialDamagesLower.match(/nonmagical\sattacks/i)
                || specialDamagesLower.match(/mundane\sattacks/i)) {
                this.set5eProperty(`system.traits.${damageID}.bypasses`, "mgc");
            }

            if (specialDamagesLower.includes("adamantine")) {
                this.set5eProperty(`system.traits.${damageID}.bypasses`, ["ada", "mgc"]);
            }

            if (specialDamagesLower.includes("silvered")) {
                this.set5eProperty(`system.traits.${damageID}.bypasses`, ["sil", "mgc"]);
            }

            // If no bypasses have been set, then assume Foundry will take care of setting the special damage text.
            if (!this.#dnd5e.system.traits?.[damageID]?.bypasses) {
                this.set5eProperty(`system.traits.${damageID}.custom`, sUtils.capitalizeFirstLetter(specialDamage));
            }
        }
    }

    setHealth() {
        this.set5eProperty("system.attributes.hp.value", this.health?.value || 0);
        this.set5eProperty("system.attributes.hp.max", this.health?.value || 0);
        this.set5eProperty("system.attributes.hp.formula", this.health?.formula || 0);
    }

    setLanguages() {
        if (!this.language) return;

        const knownValues = this.language.knownLanguages.map(sUtils.convertLanguage);
        const unknownValues = this.language.unknownLanguages.map(sUtils.convertLanguage);

        this.set5eProperty("system.traits.languages.value", knownValues);
        this.set5eProperty("system.traits.languages.custom", sUtils.capitalizeFirstLetter(unknownValues.join(";")));
    }

    setRacialDetails() {
        const getSizeAbbreviation = (size) => {
            switch (size) {
                case "small":
                    return "sm";
                case "medium":
                    return "med";
                case "large":
                    return "lg";
                case "gargantuan":
                    return "grg";
                default:
                    return size;
            }
        };

        const sizeValue = this.size.toLowerCase();
        const swarmSizeValue = this.swarmSize?.toLowerCase();

        this.set5eProperty("system.traits.size", getSizeAbbreviation(sizeValue));

        if (swarmSizeValue) {
            this.set5eProperty("system.details.type.swarm", getSizeAbbreviation(swarmSizeValue));
        }

        this.set5eProperty("system.details.alignment", sUtils.capitalizeAll(this.alignment?.trim()));
        this.set5eProperty("system.details.type.subtype", sUtils.capitalizeAll(this.race?.trim()));
        this.set5eProperty("system.details.type.value", this.type?.trim().toLowerCase());

        const hasCustomType = this.customType?.trim();
        if (hasCustomType) {
            this.set5eProperty("system.details.type.value", "custom");
            this.set5eProperty("system.details.type.custom", sUtils.capitalizeAll(this.customType?.trim()));
        }
    }

    setRole() {
        if (!this.role) return;

        this.set5eProperty("system.details.source.custom", this.role);
        this.set5eProperty("system.details.source.book", "Flee, Mortals!");
    }

    setSavingThrows() {
        for (const savingThrow of this.savingThrows) {
            const name = savingThrow.toLowerCase();
            const propPath = `system.abilities.${name}.proficient`;
            this.set5eProperty(propPath, 1);
        }
    }

    setSenses() {
        if (!this.senses) return;

        const specialSenses = [];
        for (const sense of this.senses) {
            const senseName = sense.name.toLowerCase();
            const senseRange = sense.value;
            if (senseName === "perception") {
                continue;
            } else if (senseName === "blindsight" || senseName === "darkvision" || senseName === "tremorsense" || senseName === "truesight") {
                this.set5eProperty(`system.attributes.senses.${senseName}`, senseRange);
                this.set5eProperty("token.dimSight", senseRange);
            } else {
                const specialSense = sUtils.capitalizeFirstLetter(senseName);
                specialSenses.push(`${specialSense} ${senseRange} ft`);
            }
        }
        this.set5eProperty("system.attributes.senses.special", specialSenses.join("; "));
    }

    async setSkills(actor5e) {
        // Calculate skill proficiency value by querying the actor data. This must happen after the abilities are set.
        // 1 is regular proficiency, 2 is double proficiency, etc.
        for (const skill of this.skills) {
            const skillId = sUtils.convertToShortSkill(skill.name);
            const skillMod = parseInt(skill.value);
            const actorSkill = actor5e.system.skills[skillId];
            const abilityMod = actor5e.system.abilities[actorSkill.ability].mod;
            const generalProf = actor5e.system.attributes.prof;
            const skillProf = (skillMod - abilityMod) / generalProf;
            const updatePath = `system.skills.${skillId}.value`;
            await actor5e.update({[updatePath]: skillProf});
        }
    }

    setSouls() {
        if (!this.souls) return;

        let description = "<p>Demons feast not on food or water, but on souls. These fuel their ";
        description += "bloodthirsty powers, and while starved for souls, a demon can scarcely think.</p>";
        description += "<p>A demon’s stat block states the number of souls a given demon ";
        description += "has already consumed at the beginning of combat, ";
        description += "both as a die expression and as an average number.</p>";

        const itemData = {};
        itemData.name = `Souls: ${this.souls.value} (${this.souls.formula})`;
        itemData.type = "feat";

        foundry.utils.setProperty(itemData, "system.description.value", description);
        this.addItem(itemData);
    }

    setSpeed() {
        const walkSpeed = this.speeds.find(s => s.name.toLowerCase() === "speed");
        const otherSpeeds = this.speeds.filter(s => s != walkSpeed);
        if (otherSpeeds.length) {
            this.set5eProperty("system.attributes.movement", {
                burrow: parseInt(otherSpeeds.find(s => s.name.toLowerCase() === "burrow")?.value ?? 0),
                climb: parseInt(otherSpeeds.find(s => s.name.toLowerCase() === "climb")?.value ?? 0),
                fly: parseInt(otherSpeeds.find(s => s.name.toLowerCase() === "fly")?.value ?? 0),
                swim: parseInt(otherSpeeds.find(s => s.name.toLowerCase() === "swim")?.value ?? 0),
                hover: otherSpeeds.find(s => s.name.toLowerCase() === "hover") != undefined
            });
        }
        if (walkSpeed) {
            this.set5eProperty("system.attributes.movement.walk", parseInt(walkSpeed.value));
        }
    }

    async setSpells() {
        this.missingSpells = [];
        this.obsoleteSpells = [];
        for (const spellcastingType of ["spellcasting", "innateSpellcasting", "utilitySpells"]) {
            if (this[spellcastingType].spellInfo) {
                await this.setSpellcasting(spellcastingType);
            }
        }
        if (this.missingSpells.length) {
            sUtils.warn("Some spells could not be found in your compendiums and have been created as placeholders: " + this.missingSpells.join(", "));
        }
        if (this.obsoleteSpells.length) {
            sUtils.warn("Some spells have been imported from 2014 sources while you are playing with 2024 rules, review your Compendium Options: " + this.obsoleteSpells.join(", "));
        }
    }

    async setSpellcasting(spellcastingType) {
        const { spellcastingDetails, spellInfo } = this[spellcastingType];
        const featureName = sUtils.camelToTitleCase(spellcastingType);
        const description = spellInfo[0].value.replace(new RegExp(`${featureName}\\s*(\\([^)]*\\))?\\.`, "ig"), "");

        const spells = spellInfo.slice(1);

        const spellObjs = spells.map(sg => sg.value).flat();

        const descriptionLines = [];
        if (spells.length) {
            descriptionLines.push(`<p>${description}</p>`);

            // Put spell groups on their own lines in the description so that it reads better.
            for (const spell of spells) {
                descriptionLines.push(`<p>${spell.name}: ${spell.value.map(s => s.name).join(", ")}</p>`);
            }
        }

        const itemData = {};
        itemData.name = featureName;
        itemData.type = "feat";
        foundry.utils.setProperty(itemData, "system.description.value", sUtils.combineToString(descriptionLines));
        const matchingImage = await sUtils.getImgFromPackItemAsync(itemData.name.toLowerCase());
        if (matchingImage) itemData.img = matchingImage;
        this.addItem(itemData);

        // Set spellcaster level
        if (spellcastingDetails.level) {
            this.set5eProperty("system.details.spellLevel", parseInt(spellcastingDetails.level));
        }

        // Set spellcasting ability.
        if (spellcastingDetails.ability) {
            this.set5eProperty("system.attributes.spellcasting", sUtils.convertToShortAbility(spellcastingDetails.ability));
        }

        // Add spells to actor.
        for (const spellObj of spellObjs) {
            let spell = await sUtils.getItemFromPacksAsync(spellObj.name, "spell");

            if (!spell) {
                this.missingSpells.push(spellObj.name);
                const activityId = foundry.utils.randomID();
                spell = {
                    name: spellObj.name,
                    type: "spell",
                    system: {
                        activities: {
                            [activityId]: {_id: activityId, type: "utility", activation: {type: "action", value: 1}}
                        }
                    }
                };
            }

            if (spell.system.source?.rules === "2014") {
                this.obsoleteSpells.push(spellObj.name);
            }

            if (spellObj.type === "slots") {
                // Update the actor's number of slots per level.
                this.set5eProperty(`system.spells.spell${spell.system.level}.value`, spellObj.count);
                this.set5eProperty(`system.spells.spell${spell.system.level}.max`, spellObj.count);
                this.set5eProperty(`system.spells.spell${spell.system.level}.override`, spellObj.count);
                foundry.utils.setProperty(spell, "system.preparation.prepared", true);
            } else if (spellObj.type === "innate") {
                if (spellObj.count) {
                    let mainSpellActivityId = Object.values(spell.system.activities)[0]._id;
                    foundry.utils.setProperty(spell, `system.activities.${mainSpellActivityId}.consumption.targets`, [{
                        type: "itemUses",
                        value: 1
                    }]);
                    foundry.utils.setProperty(spell, "system.uses.value", spellObj.count);
                    foundry.utils.setProperty(spell, "system.uses.max", "" + spellObj.count);
                    foundry.utils.setProperty(spell, "system.uses.recovery", [{period: "day", type: "recoverAll"}]);
                    foundry.utils.setProperty(spell, "system.preparation.mode", "innate");
                } else {
                    foundry.utils.setProperty(spell, "system.preparation.mode", "atwill");
                }
            } else if (spellObj.type === "at will") {
                foundry.utils.setProperty(spell, "system.preparation.mode", "atwill");
            } else if (spellObj.type === "cantrip") {
                // Don't need to set anything special because it should already be set on the spell we retrieved from the pack.
                foundry.utils.setProperty(spell, "system.preparation.prepared", true);
            }

            // Add the spell to the character sheet if it doesn't exist already.
            if (!this.#dnd5e.items.find(i => i.name === spell.name)) {
                this.addItem(spell);
            }
        }
    }

}