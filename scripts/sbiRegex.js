export class sbiRegex {
    // Regexes for checking known types of lines. They have to be written carefully 
    // so that it matches on the line we carea bout, but not any other random line
    // that happens to start with same the word(s).
    static armor = /^((armor|armour) class|ac)\s\d+/i;
    static actions = /^actions$/i;
    static abilities = /^(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b|\bMod\s+Save\b)/i;
    static bonusActions = /^bonus actions$/i;
    static challenge = /^(challenge|\bcr\b|challenge rating)\s\d+/i;
    static conditionImmunities = /^condition immunities\s/i;
    static damageImmunities = /^damage immunities\s/i;
    static damageResistances = /^damage resistances\s/i;
    static damageVulnerabilities = /^damage vulnerabilities\s/i;
    static health = /^(hit points|\bhp\b)\s\d+/i;
    static lairActions = /^lair actions$/i;
    static languages = /^languages\s/i;
    static legendaryActions = /^legendary actions$/i;
    static mythicActions = /^mythic actions$/i;
    // Proficiency Bonus isn't used because Foundry calculates it automatically.
    // This is just here for completeness.
    static proficiencyBonus = /^proficiency bonus\s\+/i;
    // The racial details line is here instead of below because it doesn't have a 
    // standard starting word, so we have to look at the whole line.
    static racialDetails = /^(?<size>\bfine\b|\bdiminutive\b|\btiny\b|\bsmall\b|\bmedium\b|\blarge\b|\bhuge\b|\bgargantuan\b|\bcolossal\b)(\sswarm of (?<swarmSize>\w+))?\s(?<type>\w+)([,\s]+\((?<race>[,\w\s]+)\))?([,\s]+(?<alignment>[\w\s\-]+))?/idg;
    static reactions = /^reactions$/i;
    static savingThrows = /^(saving throws|saves)\s(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/i;
    static senses = /^senses( passive)?(.+\d+\s\bft\b)?/i;
    static skills = /^skills.+[\+-]\d+/i;
    static souls = /^souls\s\d+/i;
    static speed = /^speed\s\d+\sft/i;
    static traits = /^traits$/i;
    static utilitySpells = /^utility spells$/i;
    static villainActions = /^villain actions$/i;

    // Regexes for pulling the details out of the lines we identified using the ones above.
    static armorDetails = /(?<ac>\d+)( \((?<armorType>.+)\))?/idg;
    static challengeDetails = /(?<cr>(½|[\d\/]+))\s?(?<role>[A-Za-z]+)?\s?(\(?(?<xp>[\d,]+)\s?xp\)?)?/idg;
    static rollDetails = /(?<value>\d+)\s?(\((?<formula>\d+d\d+(\s?[\+\-−–]\s?\d+)?)\))?/idg;
    static perDayBase = "(?<perDay>\\d+)\\\/day";
    static perDayDetails = new RegExp(this.perDayBase, "idg");
    static perDayCountFull = new RegExp(`\\(${this.perDayBase}[\\);]`, "idg");
    static savingThrowDetails = /must\s(make|succeed\son)\sa\sdc\s(?<saveDc>\d+)\s(?<saveAbility>\w+)\s(?<saveText>saving\sthrow|save)(?:.*(?<halfDamage>\bhalf\b)[A-Z\s]*damage)?/idg;
    static savingThrowDetails24 = /(?<saveAbility>\w+)\s(?<saveText>saving throw):\s*dc\s(?<saveDc>\d+)(?:.*success:\s(?<halfDamage>\bhalf\b))?/idg;
    static sensesDetails = /(?<name>\w+) (?<modifier>\d+)/idg;
    static skillDetails = /(?<name>\bacrobatics\b|\barcana\b|\banimal handling\b|\bathletics\b|\bdeception\b|\bhistory\b|\binsight\b|\bintimidation\b|\binvestigation\b|\bmedicine\b|\bnature\b|\bperception\b|\bperformance\b|\bpersuasion\b|\breligion\b|\bsleight of hand\b|\bstealth\b|\bsurvival\b) (?<modifier>[\+|-]\d+)/idg;
    static speedDetails = /(?<name>\w+)\s?(?<value>\d+)/idg;
    static spellcastingDetails = /spellcasting\sability\sis\s(?<ability>\w+)|(?<innateAbility>\w+)\sas\sthe\sspellcasting\sability|spell\ssave\sdc\s(?<saveDc>\d+)|(?<level>\d+)(.+)level\sspellcaster/idg;

    // The block title regex is complicated. Here's the breakdown...
    // (^|[.!]\s*\n)                                    <-  Before the title there's either the string start, or the end of a sentence and a newline.
    // ([A-Z][\w\d\-+,;'’]+[\s\-]?)                         Represents the first word of the title, followed by a space or hyphen. It has to start with a capital letter.
    //                                                      The word can include word characters, digits, and some punctuation characters.
    //                                                      NOTE: Don't add more punctuation than is absolutely neccessary so that we don't get false positives.
    // ((of|and|the|from|in|at|on|with|to|by|into)\s)?  <-  Represents the preposition words we want to ignore.
    // ([\w\d\-+,;'’]+\s?){0,3}                         <-  Represents the words that follow the first word, using the same regex for the allowed characters.
    //                                                      We assume the title only has 0-3 words following it, otherwise it's probably a sentence.
    // (\((?!spell save)[^)]+\))?                       <-  Represents an optional bit in parentheses, like '(Recharge 5-6)'.
    static blockTitle = /(?:^|[.!]\s*\n)(?<title>(?:[A-Z][\w\d\-+,;'’]+[\s\-]?)(?:(?:of|and|the|from|in|at|on|with|to|by|into)\s)?(?:[\w\d\-+,;'’]+\s?){0,3})(?:\s\((?!spell save)[^)]+\))?[.!]/dg;
    static villainActionTitle = /(^|[.!]\s*\n)(?<title>Action\s[123]:\s.+[.!?])/dg;
    // The rest of these are utility regexes to pull out specific data.
    static abilityNames = /(?<abilityName>\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/idg;
    static abilityValues = /(?<base>\d+)\s?\((?<modifier>[\+\-−–]?\d+)\)/dg;
    static abilitySaves = /(?<name>\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b) (?<modifier>[\+|-]\d+)/ig;
    static abilityValues24 = /(?<base>\d+)\s?(?<modifier>[\+\-−–]?\d+)\s?(?<saveModifier>[\+\-−–]?\d+)/dg;
    static actionCost = /\((costs )?(?<cost>\d+) action(s)?\)/idg;
    static attack = /\+(?<toHit>\d+)\sto\shit/idg;
    static attack24 = /attack\sroll:\s*\+(?<toHit>\d+)/idg;
    static conditionTypes = /(?<condition>\bblinded\b|\bcharmed\b|\bdeafened\b|\bdiseased\b|\bexhaustion\b|\bfrightened\b|\bgrappled\b|\bincapacitated\b|\binvisible\b|\bparalyzed\b|\bpetrified\b|\bpoisoned\b|\bprone\b|\brestrained\b|\bstunned\b|\bunconscious\b)/idg;
    static damageRoll = /\(?(?<baseDamageRoll>\d+d\d+?)\s?(?<baseDamageMod>[+-]\s?\d+)?\)?\s(?<baseDamageType>\w+)(?:\sdamage)(?:.+(?:plus|and)\s+(?:\d+\s+\(*)?(?:(?<addDamageRoll>\d+d\d+?)\s?(?<addDamageMod>[+-]\s?\d+)?)\)?\s(?<addDamageType>\w+)(?:\sdamage))?/idg;
    static damageTypes = /(?<damageType>\bbludgeoning\b|\bpiercing\b|\bslashing\b|\bacid\b|\bcold\b|\bfire\b|\blightning\b|\bnecrotic\b|\bpoison\b|\bpsychic\b|\bradiant\b|\bthunder\b)/idg;
    static knownLanguages = /(?<language>\baarakocra\b|\babyssal\b|\baquan\b|\bauran\b|\bcelestial\b|\bcommon\b|\bdeep\b|\bdraconic\b|\bdruidic\b|\bdwarvish\b|\belvish\b|\bgiant\b|\bgith\b|\bgnoll\b|\bgnomish\b|\bgoblin\b|\bhalfling\b|\bignan\b|\binfernal\b|\borc\b|\bprimordial\b|\bsylvan\b|\bterran\b|\bcant\b|\bundercommon\b)/idg;
    static legendaryActionCount = /take\s(?<count>\d+)\slegendary/idg;
    static lairInitiativeCount = /initiative\scount\s(?<initiativeCount>\d+)/idg;
    static spellGroupHeader = "at.will|cantrips|(?<perDay>\\d+)\\/day(?: each)?|1st|2nd|3rd|4th|5th|6th|7th|8th|9th";
    static spellGroupHeaderNoPerDay = this.spellGroupHeader.replace("?<perDay>", "");
    static spellName = new RegExp(`(?<=,|(?<spellGroup>(?:${this.spellGroupHeader})(?:[\\w\\s\\(-]*(?:(?<slots>\\d+) slot|at.will)[^:]*)?):)\\s*(?<spellName>(?:[^.,:](?!${this.spellGroupHeaderNoPerDay}))+?)(\\s[ABR]|\\s?\\+)?(?:\\s*\\(.*?\\)\\s*)?(?=,|[\\s.:]*$|\\s+(${this.spellGroupHeaderNoPerDay}))`, "idg");
    static spellLine = /(at-will|cantrips|1st|2nd|3rd|4th|5th|6th|7th|8th|9th)[\w\s\(\)-]*:/ig;
    static spellInnateLine = /at will:|\d\/day( each)?/ig;
    static spellInnateSingle = /(?<perDay>\d+)\/day.*innately\scast\s(?<spellName>[\w|\s]+)(\s\(.+\))?,/idg;
    static spellActionTItle = /\d+\/day(?:[,;]\s?(?<spellLevel>\d)(?:st|nd|rd|th)[-\s]level\sspell)?(?:[,;]\s?(?<concentration>concentration))?/idg;
    static range = /range\s(?<near>\d+)(\/(?<far>\d+))?\s?(f(ee|oo)?t|'|’)/idg;
    static reach = /reach\s(?<reach>\d+)\s?(f(ee|oo)?t|'|’)/idg;
    static recharge = /\(recharge\s(?<recharge>\d+)([–|-]\d+)?\)/idg;
    static versatile = /\((?<damageRoll>\d+d\d+( ?\+ ?\d+)?)\)\s(?<damageType>\w+)\sdamage\sif\sused\swith\stwo\shands/idg;
    static target = /(?:a\s(?<areaRange>\d+)(?:-?(?:foot|feet|ft?.|'|’)\s(?<shape>\w+))|(?<targetsAmount>each|a|one)\s[\w\s]+?(?:within\s(?<range>\d+)\s(?:foot|feet|ft?.|'|’)))/idg
}
