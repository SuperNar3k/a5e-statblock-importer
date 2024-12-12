import { sbiUtils as sUtils } from "./sbiUtils.js";
import { sbiRegex as sRegex } from "./sbiRegex.js";
import { sbiActor as sActor } from "./sbiActor.js";
import {
    NameValueData,
    ArmorData,
    RollData,
    ChallengeData,
    LanguageData,
    DamageConditionId,
    KnownCreatureTypes,
    Blocks
} from "./sbiData.js";

// Steps that the parser goes through:
//  - Break text into well defined statblock parts
//  - Create the Foundry data object from the parts

export class sbiParser {

    static actor;
    static statBlocks;

    static getFirstMatch(line, excludeIds = []) {
        return Object.keys(Blocks).filter(b => !["name", "features"].includes(b)).find(b => line.match(sRegex[b]) && !excludeIds.includes(b));
    }

    static parseInput(lines) {
        if (lines.length) {

            // Assume the first line is the name.
            this.actor = new sActor(lines.shift().trim());

            // The way this works is that this goes through each line, looks for something it recognizes,
            // and then gathers up the following lines until it hits a new thing it recognizes.
            // When that happens, it parses the lines it had been gathering up to that point.
            this.statBlocks = new Map();
            let lastBlockId = null;

            // Ability scores are tricky because there's not a consistent pattern to how
            // they're formatted. So we have to jump through some hoops. The code currently 
            // handles all statblocks from creatures in the 'testBlocks' file.
            let foundAbilityLine = false;

            // Another tricky part are the features listed under the known stuff at the top of
            // the statblock, since there's no heading for them. So we have to collect everything
            // we can after we've gone out of that part up until the next known Block.
            let foundTopBlock = true;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Ignore empty lines.
                if (!line.length) {
                    continue;
                }

                // Get the first block match, excluding the ones we already have
                const match = this.getFirstMatch(line, [...this.statBlocks.keys()]);

                // This check is a little shaky, but it's the best we can do. We assume that if
                // we've been going through the top blocks and hit a line that doesn't match anything
                // that we've found the first line of the 'features' block. BUT only if the line has
                // a block title in it, because it could also be the second in a long line of 
                // Damage Immunities or something like that.
                if (!match && foundTopBlock && line.match(sRegex.blockTitle)) {
                    foundTopBlock = false;
                    lastBlockId = Blocks.features.id;
                    this.statBlocks.set(lastBlockId, []);
                }

                if (match) {
                    foundTopBlock = Blocks[match]?.top;
                }

                // Turn off 'foundAbilityLine' when we've hit the next block.
                if (match && foundAbilityLine && match !== Blocks.abilities.id) {
                    foundAbilityLine = false;
                }

                // It should never find the same match twice, so don't bother checking to see
                // if the ID already exists on the 'statBlocks' object. Also skip over other
                // abilities after we've found the first one.
                if (match && !foundAbilityLine) {
                    lastBlockId = match;
                    this.statBlocks.set(lastBlockId, []);

                    // Set 'foundAbilityLine' to true when we've found the first ability.
                    foundAbilityLine = lastBlockId === Blocks.abilities.id;
                }

                if (this.statBlocks.has(lastBlockId)) {
                    this.statBlocks.get(lastBlockId).push({lineNumber: i, line});
                }
            }

            // Remove everything we've found so far and see what we end up with.
            const foundLines = [...this.statBlocks.values()].flat().map(l => l.line);
            let unknownLines = lines.filter(item => !foundLines.includes(item));

            for (let [blockId, blockData] of this.statBlocks.entries()) {
                switch (blockId) {
                    case Blocks.abilities.id:
                        this.parseAbilities(blockData);
                        break;
                    case Blocks.actions.id:
                    case Blocks.bonusActions.id:
                    case Blocks.features.id:
                    case Blocks.lairActions.id:
                    case Blocks.legendaryActions.id:
                    case Blocks.mythicActions.id:
                    case Blocks.reactions.id:
                    case Blocks.traits.id:
                    case Blocks.utilitySpells.id:
                    case Blocks.villainActions.id:
                        this.parseActions(blockData, blockId);
                        break;
                    case Blocks.armor.id:
                        this.parseArmor(blockData);
                        break;
                    case Blocks.challenge.id:
                        this.parseChallenge(blockData);
                        break;
                    case Blocks.conditionImmunities.id:
                        this.parseDamagesAndConditions(blockData, blockId);
                        break;
                    case Blocks.damageImmunities.id:
                        this.parseDamagesAndConditions(blockData, DamageConditionId.immunities);
                        break;
                    case Blocks.damageResistances.id:
                        this.parseDamagesAndConditions(blockData, DamageConditionId.resistances);
                        break;
                    case Blocks.damageVulnerabilities.id:
                        this.parseDamagesAndConditions(blockData, DamageConditionId.vulnerabilities);
                        break;
                    case Blocks.health.id:
                    case Blocks.souls.id:
                        this.parseRoll(blockData, blockId);
                        break;
                    case Blocks.languages.id:
                        this.parseLanguages(blockData);
                        break;
                    case Blocks.racialDetails.id:
                        this.parseRacialDetails(blockData);
                        break;
                    case Blocks.savingThrows.id:
                        this.parseSavingThrows(blockData);
                        break;
                    case Blocks.senses.id:
                        this.parseSenses(blockData);
                        break;
                    case Blocks.skills.id:
                        this.parseSkills(blockData);
                        break;
                    case Blocks.speed.id:
                        this.parseSpeed(blockData);
                        break;
                    default:
                        // Ignore anything we don't recognize.
                        break;
                }
            }

            return { actor: this.actor, statBlocks: this.statBlocks, unknownLines };
        }
    }

    // Takes an array of lines ([{lineNumber: n, line: "Line Text"}]) (I need to remember to make it an actual class for clarity)
    // Matches the joined lines on a regex, then adds match index information on any line that had any regex group matched
    static matchAndAnnotate(lines, regex) {
        if (!Array.isArray(lines)) {
            lines = [lines];
        }

        const text = sUtils.combineToString(lines.map(l => l.line));
        const matches = [...text.matchAll(regex)];
        for (let match of matches) {
            const matchData = match.indices?.groups;
            // We filter out any entry without a valid array of two indices, and we sort
            const orderedMatches = Object.entries(matchData || {}).filter(e => e[1]?.length == 2).sort((a, b) => a[1][0] - b[1][0]).map(m => ({label: m[0], indices: m[1]}));

            for (let m=0; m<orderedMatches.length; m++) {
                // For each match, we go line by line (keeping track of the total length) until we find the applicable line.
                let length = 0;
                for (let l=0; l<lines.length; l++) {
                    let line = lines[l].line;
                    let lineNumber = lines[l].lineNumber;
                    if (orderedMatches[m].indices[0] >= length && orderedMatches[m].indices[0] <= length + line.length && orderedMatches[m].indices[1] <= length + line.length) {
                        orderedMatches[m].line = lineNumber;
                        orderedMatches[m].indices[0] -= length;
                        orderedMatches[m].indices[1] -= length;
                        if (!lines[l].hasOwnProperty("matchData")) {
                            lines[l].matchData = [];
                        }
                        lines[l].matchData.push(orderedMatches[m]);
                    }
                    length += line.length + 1;
                }
            }
        }

        return matches;
    }

    static parseAbilities(lines) {

        // Check for standard abilities first.
        ////////////////////////////////////////////////
        const foundAbilityNames = [];
        const foundAbilityValues = [];
        const savingThrows24Data = [];

        for (let l of lines) {
            
            // Names come before values, so if we've found all the values then we've found all the names.
            if (foundAbilityValues.length == 6) {
                break;
            }

            // Look for ability identifiers, like STR, DEX, etc.
            const abilityMatches = [...l.line.matchAll(sRegex.abilityNames)];

            if (abilityMatches.length) {
                const names = abilityMatches.map(m => m[0]);
                foundAbilityNames.push.apply(foundAbilityNames, names);
            }

            // Look for ability values, like 18 (+4).
            const valueMatches = this.matchAndAnnotate(l, sRegex.abilityValues);

            if (valueMatches.length) {
                const values = valueMatches.map(m => m.groups.base);
                foundAbilityValues.push.apply(foundAbilityValues, values);
            }

            // Look for ability and save values (2024 format), like 18 +4 +6
            const valueMatches24 = this.matchAndAnnotate(l, sRegex.abilityValues24);

            if (valueMatches24.length) {
                const values = valueMatches24.map(m => m.groups.base);
                foundAbilityValues.push.apply(foundAbilityValues, values);
                // The 2024 format includes saving throws proficiencies here. We just check if the modifier is the same or not.
                savingThrows24Data.push.apply(savingThrows24Data, valueMatches24.map(m => m.groups.modifier !== m.groups.saveModifier));
            }

        }

        const abilitiesData = [];

        for (let i = 0; i < foundAbilityNames.length; i++) {
            abilitiesData.push(new NameValueData(foundAbilityNames[i], parseInt(foundAbilityValues[i])));
            if (savingThrows24Data[i]) {
                this.actor.savingThrows.push(foundAbilityNames[i]);
            }
        }

        this.actor.abilities = abilitiesData;

    }

    static parseArmor(lines) {
        const match = this.matchAndAnnotate(lines, sRegex.armorDetails)?.[0];
        if (!match) return;

        // AC value
        const ac = match.groups.ac;
        // Armor types, like "natural armor" or "leather armor, shield"
        const armorTypes = match.groups.armorType?.split(",").map(str => str.trim());

        this.actor.armor = new ArmorData(parseInt(ac), armorTypes);
    }

    static parseChallenge(lines) {
        const match = this.matchAndAnnotate(lines, sRegex.challengeDetails)?.[0];
        if (!match) return;
        
        const crValue = match.groups.cr;
        let cr = 0;

        // Handle fractions.
        if (crValue === "½") {
            cr = 0.5;
        } else if (crValue.includes("/")) {
            cr = sUtils.parseFraction(crValue);
        } else {
            cr = parseInt(match.groups.cr);
        }

        let xp = 0;

        if (match.groups.xp) {
            xp = parseInt(match.groups.xp.replace(",", ""));
        }

        this.actor.challenge = new ChallengeData(cr, xp);

        // MCDM's "Flee, Mortals!" puts the role alongside the challege rating,
        // so handle that here.
        this.actor.role = match.groups.role;
    }

    // Example: Damage Vulnerabilities bludgeoning, fire
    static parseDamagesAndConditions(lines, type) {
        const regex = type === Blocks.conditionImmunities.id ? sRegex.conditionTypes : sRegex.damageTypes;
        const matches = this.matchAndAnnotate(lines, regex);

        // Parse out the known damage types.
        const knownTypes = matches
            .filter(arr => arr[0].length)
            .map(arr => arr[0].toLowerCase());

        let fullLines = sUtils.combineToString(lines.map(l => l.line));
        // Remove the type name.
        switch (type) {
            case DamageConditionId.immunities:
                fullLines = fullLines.replace(/damage immunities/i, "").trim();
                break;
            case DamageConditionId.resistances:
                fullLines = fullLines.replace(/damage resistances/i, "").trim();
                break;
            case DamageConditionId.vulnerabilities:
                fullLines = fullLines.replace(/damage vulnerabilities/i, "").trim();
                break;
            case Blocks.conditionImmunities.id:
                fullLines = fullLines.replace(/condition immunities/i, "").trim();
                break;
        }

        // Now see if there is any custom text we should add.
        let customType = null;

        // Split on ";" first for lines like "poison; bludgeoning, piercing, and slashing from nonmagical attacks"
        const strings = fullLines.split(";");

        if (strings.length === 2) {
            customType = strings[1].trim();
        } else {
            // Handle something like "piercing from magic weapons wielded by good creatures"
            // by taking out the known types, commas, and spaces, and seeing if there's anything left.
            const descLeftover = fullLines.replace(regex, "").replace(/,/g, "").trim();
            if (descLeftover) {
                customType = descLeftover.replace("\n", " ");
            }
        }

        if (knownTypes.length) {
            switch (type) {
                case DamageConditionId.immunities:
                    this.actor.standardDamageImmunities = knownTypes;
                    break;
                case DamageConditionId.resistances:
                    this.actor.standardDamageResistances = knownTypes;
                    break;
                case DamageConditionId.vulnerabilities:
                    this.actor.standardDamageVulnerabilities = knownTypes;
                    break;
                case Blocks.conditionImmunities.id:
                    this.actor.standardConditionImmunities = knownTypes;
                    break;
            }
        }

        if (customType) {
            switch (type) {
                case DamageConditionId.immunities:
                    this.actor.specialDamageImmunities = customType;
                    break;
                case DamageConditionId.resistances:
                    this.actor.specialDamageResistances = customType;
                    break;
                case DamageConditionId.vulnerabilities:
                    this.actor.specialDamageVulnerabilities = customType;
                    break;
                case Blocks.conditionImmunities.id:
                    this.actor.specialConditionImmunities = customType;
                    break;
            }
        }
    }

    static parseLanguages(lines) {
        const regex = sRegex.knownLanguages;
        const matches = this.matchAndAnnotate(lines, sRegex.knownLanguages);
        if (!matches) return;

        const knownLanguages = matches
            .filter(arr => arr[0].length)
            .map(arr => arr[0].toLowerCase());
        const unknownLanguages = sUtils.combineToString(lines.map(l => l.line))
            .replace(/^languages\s*/i, "")
            .replaceAll(regex, "")
            .replaceAll(/(,\s)+/g, ";")
            .replaceAll(/,,+/g, ";")
            .replace(/^;/, "")
            .split(";")
            .filter(l => l);

        this.actor.language = new LanguageData(knownLanguages, unknownLanguages);
    }

    static parseRacialDetails(lines) {
        const match = this.matchAndAnnotate(lines, sRegex.racialDetails)?.[0];
        if (!match) return;

        this.actor.size = match.groups.size;
        this.actor.alignment = match.groups.alignment?.trim();
        this.actor.race = match.groups.race?.trim();
        this.actor.swarmSize = match.groups.swarmSize?.trim();

        const creatureType = match.groups.type?.toLowerCase().trim();
        let singleCreatureType = creatureType.endsWith('s') ? creatureType.slice(0, -1) : creatureType;
        if (singleCreatureType === "monstrositie") {
            singleCreatureType = "monstrosity";
        };
        const isKnownType = KnownCreatureTypes.includes(singleCreatureType);
        this.actor.type = isKnownType ? singleCreatureType : undefined;
        this.actor.customType = isKnownType ? undefined : creatureType;
    }

    static parseRoll(lines, type) {
        const match = this.matchAndAnnotate(lines, sRegex.rollDetails)?.[0];
        if (!match) return;

        this.actor[type] = new RollData(parseInt(match.groups.value), match.groups.formula);
    }

    static parseSavingThrows(lines) {
        const matches = this.matchAndAnnotate(lines, sRegex.abilityNames);
        if (!matches) return;

        // Save off the ability names associated with the saving throws.
        // No need to save the modifier numbers because that's calculated 
        // by Foundry when they're added to the actor.
        this.actor.savingThrows = matches.map(m => m[0]);
    }

    // Example: Senses darkvision 60 ft., passive Perception 18
    static parseSenses(lines) {
        const matches = this.matchAndAnnotate(lines, sRegex.sensesDetails);
        if (!matches) return;

        this.actor.senses = matches.map(m => new NameValueData(m.groups.name, m.groups.modifier));
    }

    static parseSkills(lines) {
        const matches = this.matchAndAnnotate(lines, sRegex.skillDetails);
        if (!matches) return;

        this.actor.skills = matches.map(m => new NameValueData(m.groups.name, m.groups.modifier));
    }

    static parseSpeed(lines) {
        const matches = this.matchAndAnnotate(lines, sRegex.speedDetails);
        if (!matches) return;

        const speeds = matches
            .map(m => new NameValueData(m.groups.name, m.groups.value))
            .filter(nv => nv.name != null && nv.value != null);
        
        if (lines.some(l => l.line.toLowerCase().includes("hover"))) {
            speeds.push(new NameValueData("hover", ""));
        }

        this.actor.speeds = speeds;
    }

    static parseActions(lines, type) {
        // Remove the first line because it's just the block name,
        // except for features because they don't have a heading.
        if (type !== Blocks.features.id) {
            lines = lines.slice(1);
        }

        if (type === Blocks.traits.id) {
            type = Blocks.features.id;
        }

        if (type === Blocks.features.id) {
            for (const actionData of this.getBlockDatas(lines)) {
                const nameLower = actionData.name.toLowerCase();

                // e.g. "Spellcasting", "Innate Spellcasting", "Innate Spellcasting (Psionics)"
                if (/^(innate )?spellcasting( \([^)]+\))?$/i.exec(nameLower)) {
                    const { spellcastingType, spellcastingDetails, spellInfo } = this.getSpells(actionData);
                    this.actor[spellcastingType] = {spellcastingDetails, spellInfo};
                } else {
                    this.actor[Blocks.features.id].push(actionData);
                }
            }
        } else if (type === Blocks.utilitySpells.id) {
            const spellDatas = this.getBlockDatas(lines);

            // There should only be one block under the Utility Spells title.
            if (spellDatas.length === 1) {
                let { spellcastingDetails, spellInfo } = this.getSpells(spellDatas[0]);
                this.actor.utilitySpells = {spellcastingDetails, spellInfo};
            }
        } else {
            let blockDatas = this.getBlockDatas(lines);

            let spellcastingOutsideFeatures = blockDatas.find(b => b.name.toLowerCase() == "spellcasting");
            if (spellcastingOutsideFeatures) {
                blockDatas = blockDatas.filter(b => b.name !== spellcastingOutsideFeatures.name);
                let { spellcastingDetails, spellInfo } = this.getSpells(spellcastingOutsideFeatures);
                this.actor.innateSpellcasting = {spellcastingDetails, spellInfo};
            }
            this.actor[type] = blockDatas;
        }

        const typeActions = Array.isArray(this.actor[type]) ? this.actor[type] : [];
        for (const actionData of typeActions) {
            if (!actionData.name.toLowerCase().includes("spellcasting")) {
                this.parseAttackOrSave(actionData);
                this.parsePerDay(actionData);
                this.parseRange(actionData);
                this.parseReach(actionData);
                this.parseRecharge(actionData);
                this.parseTarget(actionData);
                this.parseMajorFeatureInfo(actionData);
                this.parseSpellAction(actionData);
            }
        }
    }

    static parseMajorFeatureInfo(actionData) {
        if (actionData.name === "Description") {
            // How many legendary actions can it take?
            const legendaryActionMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.legendaryActionCount)?.[0];
            if (legendaryActionMatch) {
                actionData.value.legendaryActionCount = parseInt(legendaryActionMatch.groups.count);
            }
            // What iniative count does the lair action activate?
            const lairInitiativeMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.lairInitiativeCount)?.[0];
            if (lairInitiativeMatch) {
                actionData.value.lairInitiativeCount = parseInt(lairInitiativeMatch.groups.count);
            }
        } else if (actionData.name.toLowerCase().startsWith("legendary resistance")) {
            // Example:
            // Legendary Resistance (3/day)
            // This should have already been parsed by parsePerDay, we retrieve that
            const resistanceMatch = actionData.value.lines[0].matchData.find(m => m.label === "perDay");
            if (resistanceMatch) {
                actionData.value.legendaryResistanceCount = actionData.value.perDay;
            }
        } else {
            // How many actions does this cost?
            const actionCostMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.actionCost)?.[0];
            if (actionCostMatch) {
                actionData.value.actionCost = parseInt(actionCostMatch.groups.cost);
            }
        }
    }

    // Example:
    // Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10(2d6 + 3) slashing damage plus 3(1d6) acid damage.
    // or
    // Frost Breath (Recharge 5–6). The hound exhales a 15-foot cone of frost. Each creature in the cone must make a DC 13 
    // Dexterity saving throw, taking 44(8d10) cold damage on a failed save or half as much damage on a successful one.
    static parseAttackOrSave(actionData) {
        // Some attacks include a saving throw, so we'll just check for both attack rolls and saving throw rolls
        const saveMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.savingThrowDetails)?.[0] || this.matchAndAnnotate(actionData.value, sRegex.savingThrowDetails24)?.[0];
        const attackMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.attack)?.[0] || this.matchAndAnnotate(actionData.value, sRegex.attack24)?.[0];
        if (saveMatch) {
            actionData.value.save = {
                dc: saveMatch.groups.saveDc,
                ability: saveMatch.groups.saveAbility,
                damageOnSave: saveMatch.groups.half ? "half" : "none"
            };
        }
        if (attackMatch) {
            actionData.value.attack = {toHit: attackMatch.groups.toHit};            
        }
        const damageRollMatch = this.matchAndAnnotate(actionData.value.lines, sRegex.damageRoll)?.[0];
        if (damageRollMatch) {
            actionData.value.damage = {
                damageRoll: damageRollMatch.groups.damageRoll1,
                damageType: damageRollMatch.groups.damageType1,
                damageMod: damageRollMatch.groups.damageMod1,
                plusDamageRoll: damageRollMatch.groups.damageRoll2,
                plusDamageType: damageRollMatch.groups.damageType2,
                plusDamageMod: damageRollMatch.groups.damageMod2
            }
        }
        const versatilematch = this.matchAndAnnotate(actionData.value.lines, sRegex.versatile)?.[0];
        if (versatilematch) {
            actionData.value.damage.versatile = versatilematch.groups.damageRoll;
        }
    }

    // Example: Dizzying Hex (2/Day; 1st-Level Spell)
    static parsePerDay(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.perDayCountFull)?.[0];
        if (!match) return;
        actionData.value.perDay = match.groups.perDay;
    }

    // Example: Ranged Weapon Attack: +7 to hit, range 150/600 ft., one target.
    static parseRange(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.range)?.[0];
        if (!match) return;
        actionData.value.range = {near: parseInt(match.groups.near), far: match.groups.far ? parseInt(match.groups.far) : null};
        if (sUtils.combineToString(actionData.value.lines.map(l => l.line)).match(/spell attack/i)) {
            actionData.value.type = "spell";
        } else {
            actionData.value.type = "weapon";
        }
    }

    // Example: Melee Weapon Attack: +8 to hit, reach 5 ft., one target.
    static parseReach(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.reach)?.[0];
        if (!match) return;
        actionData.value.reach = parseInt(match.groups.reach);
        if (sUtils.combineToString(actionData.value.lines.map(l => l.line)).match(/spell attack/i)) {
            actionData.value.type = "spell";
        } else {
            actionData.value.type = "weapon";
        }
    }

    // Example: Frost Breath (Recharge 5–6).
    static parseRecharge(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.recharge)?.[0];
        if (!match) return;
        actionData.value.recharge = parseInt(match.groups.recharge);
    }

    // Example: Naughty Mousey (3/Day; 5th-Level Spell; Concentration).
    static parseSpellAction(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.spellActionTItle)?.[0];
        if (!match || (!match.groups.spellLevel && !match.groups.concentration)) return;
        actionData.value.spell = {level: match.groups.spellLevel, concentration: !!match.groups.concentration};
    }

    // Example: The hound exhales a 15-foot cone of frost.
    static parseTarget(actionData) {
        const match = this.matchAndAnnotate(actionData.value.lines, sRegex.target)?.[0];
        if (!match) return;
        actionData.value.target = {range: match.groups.range1 || match.groups.range2};
        if (match.groups.range1) {
            actionData.value.target.shape = match.groups.shape;
        } else {
            actionData.value.target.type = "creature";
            if (["one", "a"].includes(match.groups.targetsAmount)) {
                actionData.value.target.amount = 1;
            }
        }
    }

    // Separates the action/feature block into individual items, keeping the lines objects intact for further matching.
    static getBlockDatas(lines) {
        const validLines = lines.filter(l => l.line);

        // Pull out the entire spell block because it's formatted differently than all the other action blocks.
        const notSpellLines = [];
        const spellLines = [];
        let foundSpellBlock = false;

        // Start taking lines from the spell block when we've found the beginning until 
        // we've gotten into the spells and hit a line where the next line has a period.
        for (let index = 0; index < validLines.length; index++) {
            let l = validLines[index];

            if (!foundSpellBlock) {
                foundSpellBlock = l.line.match(/\binnate spellcasting\b|\bspellcasting\b/i) != null;
                if (foundSpellBlock && l.line === "Spellcasting" && !l.line.endsWith(".")) {
                    l.line = l.line + ".";
                }
            }

            // If we're inside of a spell block, store it off in the spell lines array,
            // otherwise store it into the not spell lines array.
            if (foundSpellBlock) {
                spellLines.push(l);
            } else {
                foundSpellBlock = false;
                notSpellLines.push(l);
            }

            // Check to see if we've reached the end of the spell block by seeing if 
            // the next line is a title.
            const nextLineIsTitle = index < validLines.length - 1
                && validLines[index + 1].line.match(sRegex.blockTitle);

            if (foundSpellBlock && nextLineIsTitle) {
                // Add a period at the end so that blocks are extracted correctly.
                if (!spellLines[spellLines.length - 1].line.endsWith(".")) {
                    spellLines[spellLines.length - 1].line = spellLines[spellLines.length - 1].line + ".";
                }

                // Break out of the spell block.
                foundSpellBlock = false;
            }
        }

        const actionsLines = notSpellLines.concat(spellLines);
        
        let titleMatches = this.matchAndAnnotate(actionsLines, sRegex.blockTitle);
        if (!titleMatches.length) {
            titleMatches = this.matchAndAnnotate(actionsLines, sRegex.villainActionTitle);
        }

        let i = -1;
        let action;
        const actions = actionsLines.reduce((acc, actionLine) => {
            if (actionLine.matchData?.some(m => m.label === "title")) {
                if (action) {
                    acc.push(action);
                }
                action = new NameValueData(titleMatches[++i].groups.title, {lines: [actionLine]});
            } else {
                if (!action) {
                    action = new NameValueData("Description", {lines: []});
                }
                action.value.lines.push(actionLine);
            }
            return acc;
        }, []);
        actions.push(action);

        return actions;
    }

    static getSpells(spellBlock) {
        let spellRegex = sRegex.spellInnateLine;
        let spellcastingType = "innateSpellcasting";
        let spellMatches = this.matchAndAnnotate(spellBlock.value.lines, spellRegex);

        if (!spellMatches.length) {
            spellRegex = sRegex.spellLine;
            spellcastingType = "spellcasting";
            spellMatches = this.matchAndAnnotate(spellBlock.value.lines, spellRegex);
        }

        const spellGroups = [];

        if (spellMatches.length) {
            let introDescription = sUtils.combineToString(spellBlock.value.lines.map(l => l.line))
                .replace(/\n/g, " ")
                .trim();
            
            spellGroups.push(new NameValueData("Description", introDescription));

            const spellNameMatches = this.matchAndAnnotate(spellBlock.value.lines, sRegex.spellName);

            if (spellNameMatches.length) {
                let spellType, spellCount;
                for (let spellMatch of spellNameMatches) {
                    let spellName = sUtils.capitalizeAll(spellMatch.groups.spellName).replace(/\(.*\)/, "").trim();
                    if (spellMatch.groups.spellGroup) {
                        if (spellMatch.groups.slots) {
                            spellType = "slots";
                            spellCount = parseInt(spellMatch.groups.slots);
                        } else if (spellMatch.groups.perDay) {
                            spellType = "innate";
                            spellCount = parseInt(spellMatch.groups.perDay);
                        } else if (spellMatch.groups.spellGroup.toLowerCase().includes("at will")) {
                            spellType = spellcastingType === "spellcasting" ? "cantrip" : "at will";
                        }
                        spellGroups.push(new NameValueData(spellMatch.groups.spellGroup, [{name: spellName, type: spellType, count: spellCount}]));
                    } else if (spellType) {
                        spellGroups[spellGroups.length - 1].value.push({name: spellName, type: spellType, count: spellCount});
                    }
                }
                introDescription = introDescription.slice(0, spellMatches[0].index);
            } else {
                // Some spell casting description bury the spell in the description, like Mehpits.
                // Example: The mephit can innately cast fog cloud, requiring no material components.
                const spellInnateSingleMatch = this.matchAndAnnotate(spellBlock.value.lines, sRegex.spellInnateSingle)?.[0];
                if (spellInnateSingleMatch) {
                    spellGroups.push(new NameValueData(spellInnateSingleMatch.groups.perDay + "/day", [{name: spellInnateSingleMatch.groups.spellName, type: "innate", count: parseInt(spellInnateSingleMatch.groups.perDay)}]));
                }
            }
        }

        const spellcastingDetailsMatches = this.matchAndAnnotate(spellBlock.value.lines, sRegex.spellcastingDetails);

        let spellcastingDetails = {};
        for (let match of spellcastingDetailsMatches) {
            if (match.groups.ability1 || match.groups.ability2) {
                spellcastingDetails.ability = match.groups.ability1 || match.groups.ability2;
            }
            if (match.groups.saveDc) {
                spellcastingDetails.saveDc = match.groups.saveDc;
            }
            if (match.groups.level) {
                spellcastingDetails.level = match.groups.level;
            }
        }

        return { spellcastingType, spellcastingDetails, spellInfo: spellGroups };
    }

}