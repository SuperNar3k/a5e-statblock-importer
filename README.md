![Latest Version](https://img.shields.io/github/v/release/Aioros/5e-statblock-importer?filter=!*-*)
![Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FAioros%2F5e-statblock-importer%2Fmain%2Fmodule.json)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2F5e-statblock-importer&colorB=blueviolet)
![License](https://img.shields.io/github/license/Aioros/5e-statblock-importer)

# 5e Statblock Importer
A module for FoundryVTT's **Dungeons & Dragons Fifth Edition** System. Easily import 5e monster and NPC statblocks into your game. As long as it's formatted using the standard WotC layout, it'll create a new actor with an NPC character sheet using those stats.

## How to use
Once installed, you'll see a new button at the bottom of the characters tab that looks like this:

![image](https://user-images.githubusercontent.com/5131886/128588603-cbbc558c-8ae5-4005-a56f-0c28afb6fcfd.png)

Clicking the button will open a window with a big text box that you can past the statblock into. Here's an example of one for a Glabrezu from the [SRD](https://dnd.wizards.com/articles/features/systems-reference-document-srd).

![image](https://github.com/user-attachments/assets/88767a1a-1ed1-45bd-a769-4c7f5ef4444b)

You can parse the text with the "Parse" button (or, if the "Auto parse" option is checked, the text will be parsed automatically every time you paste it or modify it). Parsing will underline all the information that was found in the statblock, so you can check that everything is in order before importing.
If you're satisfied with the preview, click the "Import" button and you'll see a new actor appear in the side panel.

![image](https://user-images.githubusercontent.com/5131886/128589018-48fc68f1-6e82-46fb-9d49-4e420cca3a26.png)

Open the character sheet for that new actor and you'll see all of the stats, actions, and spells filled out for you. Everything in the statblock should be represented on the character sheet, including legendary actions and reactions (which the Glabrezu doesn't have). To have the spells show up in the Spellbook requires having the "Spells (SRD)" compendium installed, which should come with the 5e system.

![image](https://github.com/user-attachments/assets/f6e20048-86ab-4457-ad95-328ce213397e)
![image](https://github.com/user-attachments/assets/7813a4cf-9f11-43e7-95c2-db9c27f0b315)

Here's the text if you want to try it yourself and don't have any statblocks handy.

```
Glabrezu
Large fiend (demon), chaotic evil
Armor Class 17 (natural armor)
Hit Points 157 (15d10 + 75)
Speed 40 ft.
STR
DEX
CON
INT
WIS
CHA
20 (+5) 15 (+2) 21 (+5) 19 (+4) 17 (+3) 16 (+3)
Saving Throws Str +9, Con +9, Wis +7, Cha +7
Damage Resistances cold, fire, lightning; bludgeoning,
piercing, and slashing from nonmagical attacks
Damage Immunities poison
Condition Immunities poisoned
Senses truesight 120 ft., passive Perception 13
Languages Abyssal, telepathy 120 ft.
Challenge 9 (5,000 XP)
Innate Spellcasting. The glabrezu’s spellcasting ability
is Intelligence (spell save DC 16). The glabrezu can
innately cast the following spells, requiring no material
components:
At will: darkness, detect magic, dispel magic
1/day each: confusion, fly, power word stun
Magic Resistance. The glabrezu has advantage on
saving throws against spells and other magical effects.
Actions
Multiattack. The glabrezu makes four attacks: two with
its pincers and two with its fists. Alternatively, it makes
two attacks with its pincers and casts one spell.
Pincer. Melee Weapon Attack: +9 to hit, reach 10 ft.,
one target. Hit: 16 (2d10 + 5) bludgeoning damage. If
the target is a Medium or smaller creature, it is
grappled (escape DC 15). The glabrezu has two pincers,
each of which can grapple only one target.
Fist. Melee Weapon Attack: +9 to hit, reach 5 ft., one
target. Hit: 7 (2d4 + 2) bludgeoning damage.
```

## API
The module exposes an API with two functions: `parse()` and `import()`. Here's two simple examples:

```js
// Parse and then import

const sbiApi = game.modules.get("5e-statblock-importer").api;
const glabrezu = String.raw // Not including the full text here, but you get the idea
    `Glabrezu
    Large fiend (demon), chaotic evil
    ...
    target. Hit: 7 (2d4 + 2) bludgeoning damage.`;
const parsedGlabrezu = sbiApi.parse(glabrezu);
console.log(parsedGlabrezu);

// the result object has the following properties:
//      actor: an object representation of all the parsed information for this creature
//      statBlocks: a Map with all the different sections of the statblock and the text lines assigned to them
//      lines: an array containing the provided lines of text
//      unknownLines: an array containing any line that was not assigned to a block.

const myFolder = game.folders.getName("My Folder").id;
const { actor5e, importIssues } = await parsedGlabrezu.actor.createActor5e(myFolder.id);
```
```js
// Direct import

const sbiApi = game.modules.get("5e-statblock-importer").api;
const glabrezu = String.raw
    `Glabrezu
    Large fiend (demon), chaotic evil
    ...
    target. Hit: 7 (2d4 + 2) bludgeoning damage.`;
const myFolder = game.folders.getName("My Folder").id;
const { actor5e, importIssues } = await sbiApi.import(glabrezu, myFolder.id);
```

## Issues
If you find a statblock that doesn't import correctly, open an issue [here](https://github.com/Aioros/5e-statblock-importer/issues) and include the text that you were trying to use.

## Credit
Most of the work on this module was done by [James Haywood](https://github.com/jbhaywood). This fork aims to continue improving and supporting new formats and new Foundry/dnd5e versions while keeping the original vision intact.

## Original Credit
This module was based on the [Pathfinder 1e Statblock Library](https://github.com/baileymh/statblock-library) module because I hadn't made a module before and needed a place to start.

## License
This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).  
This Foundry VTT module, originally written by James Haywood, is licensed under the [MIT License](https://github.com/Aioros/5e-statblock-importer/blob/main/LICENSE).
