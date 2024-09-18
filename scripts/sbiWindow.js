import { sbiUtils } from "./sbiUtils.js";
import { sbiParser } from "./sbiParser.js";
import { sbiConfig } from "./sbiConfig.js";
import { sbiActor as sActor } from "./sbiActor.js";
import { BlockName } from "./sbiData.js";

export class sbiWindow extends Application {

    constructor(options) {
        super(options);
        this.keyupParseTimeout = null;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "sbi-window";
        options.template = "modules/5e-statblock-importer/templates/sbiWindow.hbs";
        options.width = 800;
        options.resizable = true;
        options.classes = ["sbi-window"];
        options.popup = true;
        options.title = "5e Statblock Importer";

        return options;
    }

    getData() {
        return {
            blocks: BlockName,
            testSelected: "abilities"
        };
    }

    static sbiInputWindowInstance = {}

    static async renderWindow() {
        sbiWindow.sbiInputWindowInstance = new sbiWindow();
        sbiWindow.sbiInputWindowInstance.render(true);
    }

    static insertTextAtSelection(div, txt) {
        //get selection area so we can position insert
        let sel = window.getSelection();
        let text = div.textContent;
        let before = Math.min(sel.focusOffset, sel.anchorOffset);
        let after = Math.max(sel.focusOffset, sel.anchorOffset);
        //ensure string ends with \n so it displays properly
        let afterStr = text.substring(after);
        if (afterStr == "") afterStr = "\n";
        //insert content
        div.textContent = text.substring(0, before) + txt + afterStr;
        //restore cursor at correct position
        sel.removeAllRanges();
        let range = document.createRange();
        //childNodes[0] should be all the text
        range.setStart(div.childNodes[0], before + txt.length);
        range.setEnd(div.childNodes[0], before + txt.length);
        sel.addRange(range);
    }

    static async parse() {
        if ($("#sbi-input").text().trim().length == 0) return;
        
        const lines = $("#sbi-input")
            .text()
            .trim()
            .split(/[\n\r]+/g)
            .filter(str => str.length); // remove empty lines

        try {
            const { creature, statBlocks } = await sbiParser.parseInput(lines);

            // This is where we retrieve the regex match indices and map them to parts of our lines to create spans
            [...statBlocks.entries()].forEach(([key, value]) => {
                let matchData = value.matchData;
                if (matchData) {
                    if (!Array.isArray(matchData)) {
                        matchData = [matchData];
                    }
                    // We loop through the matches starting from the last one
                    for (let md=matchData.length-1; md>=0; md--) {
                        const matchDataObject = matchData[md];
                        const specificLine = matchDataObject.line;
                        // We filter out any entry without a valid array of two indices, and we sort last match first
                        const orderedMatches = Object.entries(matchDataObject).filter(e => e[1]?.length == 2).sort((a, b) => b[1][0] - a[1][0]).map(m => ({label: m[0], indices: m[1]}));

                        for (let m=0; m<orderedMatches.length; m++) {
                            // For each match, we go line by line (keeping track of the total length) until we find the applicable line. If a specificLine is set, we'll get that one.
                            let length = 0;
                            for (let l=0; l<value.length; l++) {
                                let line = value[l].line;
                                let lineNumber = value[l].lineNumber;
                                if (
                                    (specificLine === lineNumber) ||
                                    (typeof specificLine === "undefined" && orderedMatches[m].indices[0] >= length && orderedMatches[m].indices[1] >= length && orderedMatches[m].indices[0] <= length + line.length && orderedMatches[m].indices[1] <= length + line.length)
                                ) {
                                    // We surround the matched part with a <span>
                                    const previousLinesLength = typeof specificLine === "undefined" ? length : 0;
                                    lines[lineNumber] = [lines[lineNumber].slice(0, orderedMatches[m].indices[1] - previousLinesLength), "</span>", lines[lineNumber].slice(orderedMatches[m].indices[1] - previousLinesLength)].join("");
                                    lines[lineNumber] = [
                                        lines[lineNumber].slice(0, orderedMatches[m].indices[0] - previousLinesLength),
                                        `<span class="matched" data-tooltip="${BlockName[key] + ": " + sbiUtils.camelToTitleUpperIfTwoLetters(orderedMatches[m].label)}">`,
                                        lines[lineNumber].slice(orderedMatches[m].indices[0] - previousLinesLength)
                                    ].join("").trim();
                                }
                                length += line.length + 1;
                            }
                        }
                    }
                }
            });

            let spanLines = lines.map((line, i) => {
                const block = [...statBlocks.entries()].find(e => e[1].some(l => l.lineNumber == i))?.[0];
                return $("<span>")
                    .attr("data-line", i)
                    .attr("data-block", block)
                    .html(line);
            });

            const scrollTop = $("#sbi-input").scrollTop();
            $("#sbi-input").html(`<span class="block-header" data-block="Name" contenteditable="false" readonly></span>`).append("\n");
            $("#sbi-input").append(`<span data-line="-1" data-block="name">` + creature.name + "</span>\n");
            let previousBlock = "";
            spanLines.forEach(l => {
                if (l.attr("data-block") != previousBlock) {
                    $("#sbi-input").append(`<span class="block-header" data-block="${BlockName[l.attr("data-block")] || "???"}" contenteditable="false" readonly></span>`).append("\n");
                    previousBlock = l.attr("data-block");
                }
                $("#sbi-input").append(l).append("\n");
            });
            $("#sbi-input").scrollTop(scrollTop);

            return { creature, statBlocks };
        } catch (error) {
            if (sbiConfig.options.debug) {
                throw(error);
            } else {
                ui.notifications.error("5E STATBLOCK IMPORTER: An error has occured. Please report it using the module link so it can get fixed.");
                sbiUtils.log(`ERROR: ${error}`);
            }
        }
    }

    activateListeners(html) {
        sbiUtils.log("Listeners activated")
        super.activateListeners(html);

        const input = document.getElementById("sbi-input");

        input.addEventListener("keydown", e => {
            //override pressing enter in contenteditable
            if (e.key == "Enter") {
                //don't automatically put in divs
                e.preventDefault();
                e.stopPropagation();
                //insert newline
                sbiWindow.insertTextAtSelection(input, "\n");
            }
        });
        input.addEventListener("paste", e => {
            //cancel paste
            e.preventDefault();
            //get plaintext from clipboard
            let text = (e.originalEvent || e).clipboardData.getData('text/plain');
            //insert text manually
            sbiWindow.insertTextAtSelection(input, text);
        });

        const folderSelect = $("#sbi-import-select")[0];

        // Add a default option.
        const noneFolder = "None";
        folderSelect.add(new Option(noneFolder));

        var actorFolders = [...game.folders]
            .filter(f => f.type === "Actor")
            .map(f => ({ "name": f.name, "id": f._id }));

        // Add the available folders.
        for (const folder of actorFolders) {
            folderSelect.add(new Option(folder.name));
        }

        $("#sbi-input").on("blur input paste", async () => {
            if ($("#sbi-import-autoparse").prop("checked")) {
                if (this.keyupParseTimeout) clearTimeout(this.keyupParseTimeout);
                this.keyupParseTimeout = setTimeout(sbiWindow.parse, 1000);
            }
        });
        $("#sbi-import-parse").on("click", sbiWindow.parse);

        const importButton = $("#sbi-import-button");
        importButton.on("click", async function () {
            sbiUtils.log("Clicked import button");
            const selectedFolderName = folderSelect.options[folderSelect.selectedIndex].text;
            const selectedFolder = selectedFolderName == noneFolder ? null : actorFolders.find(f => f.name === selectedFolderName);
            const { creature } = await sbiWindow.parse();
            if (creature) {
                const actor = await sActor.convertCreatureToActorAsync(creature, selectedFolder?.id);
                // Open the sheet.
                actor.sheet.render(true);
            }
        });

        // ###############################
        // DEBUG
        // ###############################
        if (sbiConfig.options.debug && sbiConfig.options.autoDebug) {
            const lines = sbiConfig.options.testBlock
                .trim()
                .split(/\n/g)
                .filter(str => str.length); // remove empty lines

            sbiParser.parseInput(lines)
                .then(parseResult => { return sActor.convertCreatureToActorAsync(parseResult.creature, null); })
                .then(actor => { actor.sheet.render(true); });
        }
    }
}