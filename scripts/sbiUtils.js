import { sbiConfig, getPacks } from "./sbiConfig.js";

export class sbiUtils {

    static log(message, force = false) {
        if (sbiConfig.options.debug || force) {
            console.log("5e Statblock Importer | " + message);
        }
    }

    static getAbilityMod(abilityValue) {
        return Math.floor((abilityValue - 10) / 2);
    }

    static getProficiencyBonus(level) {
        return 2 + Math.floor((level - 1) / 4);
    }

    static convertToShortAbility(abilityName) {
        const ability = abilityName.toLowerCase();

        switch (ability) {
            case "strength":
                return "str";
            case "dexterity":
                return "dex";
            case "constitution":
                return "con";
            case "intelligence":
                return "int";
            case "wisdom":
                return "wis";
            case "charisma":
                return "cha";
            default:
                return ability;
        }
    }

    static convertLanguage(language) {
        let result = language.toLowerCase();

        switch (result) {
            case "deep speech":
                result = "deep";
                break;
            case "thieves' cant":
                result = "cant";
                break;
            default:
                break;
        }

        return result;
    }

    static convertToShortSkill(skillName) {
        const skill = skillName.toLowerCase();

        switch (skill) {
            case "acrobatics":
                return "acr";
            case "animal handling":
                return "ani";
            case "arcana":
                return "arc";
            case "athletics":
                return "ath";
            case "deception":
                return "dec";
            case "history":
                return "his";
            case "insight":
                return "ins";
            case "intimidation":
                return "itm";
            case "investigation":
                return "inv";
            case "medicine":
                return "med";
            case "nature":
                return "nat";
            case "perception":
                return "prc";
            case "performance":
                return "prf";
            case "persuasion":
                return "per";
            case "religion":
                return "rel";
            case "sleight of hand":
                return "slt";
            case "stealth":
                return "ste";
            case "survival":
                return "sur";
            default:
                return skill;
        }
    }

    // Search all compendiums and get just the icon from the item, if found.
    // Don't get the whole item because the one from the statblock may be different.
    static async getImgFromPackItemAsync(itemName, type) {
        let result = null;
        const item = await this.getItemFromPacksAsync(itemName, type);

        if (item) {
            result = item.img;
        }

        return result;
    }

    static async getItemFromPacksAsync(itemName, type) {
        let result = null;

        const packs = getPacks()[type === "spell" ? "spells" : "items"].filter(p => p.active);

        for (const pack of packs) {
            result = await this.getItemFromPackAsync(game.packs.get(pack.collection), itemName);

            if (result && (!type || result.type === type)) {
                break;
            }
        }

        return result;
    }

    static async getItemFromPackAsync(pack, itemName) {
        let result = null;
        const normalizedName = itemName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
        const item = pack.index.find(e => normalizedName === e.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_"));

        if (item) {
            const itemDoc = await pack.getDocument(item._id);
            result = itemDoc.toObject();
        }

        return result;
    }

    // ==========================
    // String Functions    
    // ==========================
    // camelToTitleCase("legendaryActions") => "Legendary Actions"
    static camelToTitleCase(string) {
        return string// insert a space before all caps
            .replace(/([A-Z])/g, ' $1')
            // uppercase the first character
            .replace(/^./, function (str) { return str.toUpperCase(); })
    }

    // capitalizeAll("passive perception") => "Passive Perception"
    static capitalizeAll(string) {
        if (!string) {
            return null;
        }

        return string.toLowerCase().replace(/^\w|\s\w|\(\w/g, function (letter) {
            return letter.toUpperCase();
        })
    }

    static camelToTitleUpperIfTwoLetters(string) {
        return this.camelToTitleCase(string).split(" ").map(w => w.length == 2 ? w.toUpperCase() : w).join(" ");
    }

    // capitalizeFirstLetter("passive perception") => "Passive perception"
    static capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // format("{0} comes before {1}", "a", "b") => "a comes before b"
    static format(stringToFormat, ...tokens) {
        return stringToFormat.replace(/{(\d+)}/g, function (match, number) {
            return typeof tokens[number] != 'undefined' ? tokens[number] : match;
        });
    };

    // startsWithCapital("Foo") => true
    static startsWithCapital(string) {
        return /[A-Z]/.test(string.charAt(0))
    }

    // parseFraction("1/2") => 0.5
    static parseFraction(string) {
        let result = null;
        const numbers = string.split("/");

        if (numbers.length == 2) {
            const numerator = parseFloat(numbers[0]);
            const denominator = parseFloat(numbers[1]);
            result = numerator / denominator;
        }

        return result;
    }

    static exactMatch(string, regex) {
        const match = string.match(regex);
        return match && match[0] === string;
    }

    static replaceAt(string, index, char) {
        if (index > string.length - 1) return string;
        return string.substring(0, index) + char + string.substring(index + 1);
    }

    static trimStringEnd(string, trimString) {
        let result = string;

        if (string.endsWith(trimString)) {
            result = string.substr(0, string.length - trimString.length);
        }

        return result;
    }

    // Given an array of strings, returns an array of strings, each representing one sentence.
    // I'm trying to find a way to NOT have to do this at all
    static makeSentences(lines) {
        let sentences = [];
        let newSentence = "";
        let sourceStart = {lineNumber: null, index: 0};
        let sourceEnd = {lineNumber: null, index: 0};
        for (let {lineNumber, line} of lines) {
            sourceStart.lineNumber ||= lineNumber;
            sourceEnd.lineNumber = lineNumber;
            sourceEnd.index = 0;
            if (newSentence) newSentence += " ";
            // Split on "." or "!", except for "ft."
            const parts = line.split(/(?<!ft)[.!]/);
            for (let p=0; p<parts.length; p++) {
                newSentence += parts[p];
                sourceEnd.index += parts[p].length;
                if (p < parts.length - 1) {
                    sentences.push({line: newSentence, sourceStart: foundry.utils.deepClone(sourceStart), sourceEnd: foundry.utils.deepClone(sourceEnd)});
                    newSentence = "";
                    sourceStart.lineNumber = lineNumber;
                    sourceEnd.lineNumber = lineNumber;
                    sourceStart.index = sourceEnd.index + 1;
                }
            }
        }
        if (newSentence) sentences.push({line: newSentence, sourceStart: foundry.utils.deepClone(sourceStart), sourceEnd: foundry.utils.deepClone(sourceEnd)});

        sentences.forEach(s => {
            if (s.line.startsWith(" ")) {
                s.line = s.line.slice(1);
                s.sourceStart.index++;
            }
            if (s.line.endsWith(" ")) {
                s.line = s.line.slice(-1);
                s.sourceEnd.index--;
            }
            s.line += ".";
        });
        return sentences;
    }

    // Given an array of strings, returns an array of strings, each representing one sentence.
    static makeSentencesOld(strings) {
        return this.combineToString(strings)
            .split(/[.!]/)
            .filter(str => str)
            .map(str => str.trim(" ") + ".");
    }

    // Given an array of strings, returns one string.
    static combineToString(strings) {
        return strings
            .join("\n");
            //.replace("- ", "-");
    }

    // Given an array of source lines, combine their text and remove the action/feature name from the start
    static combineSourceLines(lines, removeName = true) {
        let combined = this.combineToString(lines.map(l => l.line))
            .replace("\n", " ");
        if (removeName) {
            combined = combined.replace(/^[^.]*\.\s*/i, "");
        }
        return combined;
    }

    // ==========================
    // Array Functions    
    // ==========================

    // last([1,2,3]) => 3
    static last(array) {
        return array[array.length - 1];
    }

    // skipWhile([1,2,3], (item) => item !== 2) => [2,3]
    static skipWhile(array, callback) {
        let doneSkipping = false;

        return array.filter((item) => {
            if (!doneSkipping) {
                doneSkipping = !callback(item);
            }

            return doneSkipping;
        });
    };

    // intersect([1,2,3], [2]) => [2]
    static intersect(sourceArr, targetArr) {
        return sourceArr.filter(item => targetArr.indexOf(item) !== -1);
    };

    // except([1,2,3], [2]) => [1,3]
    static except(sourceArr, targetArr) {
        return sourceArr.filter(item => targetArr.indexOf(item) === -1);
    };
}