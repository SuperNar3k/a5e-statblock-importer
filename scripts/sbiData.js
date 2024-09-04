export class BlockID {
    static armor = "armor";
    static actions = "actions";
    static abilities = "abilities";
    static bonusActions = "bonusActions";
    static challenge = "challenge";
    static conditionImmunities = "conditionImmunities";
    static damageImmunities = "damageImmunities";
    static damageResistances = "damageResistances";
    static damageVulnerabilities = "damageVulnerabilities";
    static features = "features";
    static health = "health";
    static lairActions = "lairActions";
    static languages = "languages";
    static legendaryActions = "legendaryActions";
    static mythicActions = "mythicActions";
    static proficiencyBonus = "proficiencyBonus";
    static racialDetails = "racialDetails";
    static reactions = "reactions";
    static savingThrows = "savingThrows";
    static senses = "senses";
    static skills = "skills";
    static souls = "souls";
    static speed = "speed";
    static traits = "traits";
    static utilitySpells = "utilitySpells";
    static villainActions = "villainActions";
}

export const BlockName = {
    name: "Name",
    armor: "Armor",
    actions: "Actions",
    abilities: "Abilities",
    bonusActions: "Bonus Actions",
    challenge: "Challenge",
    conditionImmunities: "Condition Immunities",
    damageImmunities: "Damage Immunities",
    damageResistances: "Damage Resistances",
    damageVulnerabilities: "Damage Vulnerabilities",
    features: "Features",
    health: "Health",
    lairActions: "Lair Actions",
    languages: "Languages",
    legendaryActions: "Legendary Actions",
    mythicActions: "Mythic Actions",
    proficiencyBonus: "Proficiency Bonus",
    racialDetails: "Racial Details",
    reactions: "Reactions",
    savingThrows: "Saving Throws",
    senses: "Senses",
    skills: "Skills",
    souls: "Souls",
    speed: "Speed",
    traits: "Traits",
    utilitySpells: "Utility Spells",
    villainActions: "Villain Actions"
}

export const TopBlocks = [
    BlockID.armor,
    BlockID.abilities,
    BlockID.challenge,
    BlockID.conditionImmunities,
    BlockID.damageImmunities,
    BlockID.damageResistances,
    BlockID.damageVulnerabilities,
    BlockID.health,
    BlockID.languages,
    BlockID.proficiencyBonus,
    BlockID.racialDetails,
    BlockID.savingThrows,
    BlockID.senses,
    BlockID.skills,
    BlockID.souls,
    BlockID.speed,
]

export class DamageConditionId {
    static immunities = "immunities";
    static resistances = "resistances";
    static vulnerabilities = "vulnerabilities";
}

export const KnownCreatureTypes = [
    "aberration",
    "celestial",
    "dragon",
    "fey",
    "giant",
    "monstrosity",
    "plant",
    "beast",
    "construct",
    "elemental",
    "fiend",
    "humanoid",
    "ooze",
    "undead"
];

export class CreatureData {
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
        this.role = null;                           // string           (MCDM)
        this.savingThrows = [];                     // string[]
        this.senses = [];                           // NameValueData[]
        this.specialSense = null;                   // string
        this.skills = [];                           // NameValueData[]
        this.speeds = [];                           // NameValueData[]
        this.spellcasting = [];                     // NameValueData[]
        this.innateSpellcasting = [];               // NameValueData[]
        this.size = null;                           // string
        this.souls = null;                          // RollData
        this.race = null;                           // string
        this.type = null;                           // string
        this.utilitySpells = [];                    // NameValueData[]  (MCDM)
        this.villainActions = [];                   // NameValueData[]  (MCDM)
        this.standardConditionImmunities = [];      // string[]
        this.standardDamageImmunities = [];         // string[]
        this.standardDamageResistances = [];        // string[]
        this.standardDamageVulnerabilities = [];    // string[]
        this.specialConditionImmunities = null;     // string
        this.specialDamageImmunities = null;        // string
        this.specialDamageResistances = null;       // string
        this.specialDamageVulnerabilities = null;   // string
    }
}

/*
name: string
value: object
*/
export class NameValueData {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

/*
ac: int
types: string[]
*/
export class ArmorData {
    constructor(ac, types) {
        this.ac = ac;
        this.types = types || [];
    }
}

/*
cr: int
xp: int
*/
export class ChallengeData {
    constructor(cr, xp) {
        this.cr = cr;
        this.xp = xp;
    }
}

/*
value: int
diceFormula: string
*/
export class RollData {
    constructor(value, diceFormula) {
        this.value = value;
        this.formula = diceFormula;
    }
}

/*
knownLanguages: string[]
unknownLanguages: string[]
*/
export class LanguageData {
    constructor(knownLanguages, unknownLanguages) {
        this.knownLanguages = knownLanguages;
        this.unknownLanguages = unknownLanguages;
    }
}
