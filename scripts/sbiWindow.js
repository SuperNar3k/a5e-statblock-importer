import { sbiUtils } from "./sbiUtils.js";
import { sbiParser } from "./sbiParser.js";
import { MODULE_NAME } from "./sbiConfig.js";
import { Blocks } from "./sbiData.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class sbiWindow extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor(options) {
        super(options);
        this.keyupParseTimeout = null;
    }

    static DEFAULT_OPTIONS = {
        id: "sbi-window",
        position: { width: 800, height: 640 },
        classes: ["sbi-window"],
        window: {
            resizable: true,
            title: "5e Statblock Importer"
        },
        actions: {
            parse: sbiWindow.parse,
            import: sbiWindow.import
        }
    };

    static PARTS = {
        form: {
            template: `modules/${MODULE_NAME}/templates/sbiWindow.hbs`
        }
    };

    static sbiInputWindowInstance = {};

    static async renderWindow() {
        sbiWindow.sbiInputWindowInstance = new sbiWindow();
        sbiWindow.sbiInputWindowInstance.render(true);
    }

    _onRender(context, options) {
        const input = document.getElementById("sbi-input");

        input.addEventListener("keydown", e => {
            [...this.element.querySelectorAll("#sbi-input span.block-header")].forEach(s => s.remove());
            
            //override pressing enter in contenteditable
            if (e.key == "Enter") {
                //don't automatically put in divs
                e.preventDefault();
                e.stopPropagation();
                //insert newline
                sbiWindow.insertTextAtSelection("\n");
            }
            input.dispatchEvent(new Event('input'));
        });

        input.addEventListener("paste", e => {
            //cancel paste
            e.preventDefault();
            //get plaintext from clipboard
            let text = (e.originalEvent || e).clipboardData.getData("text/plain");
            //remove unicode format control characters
            text = text.replace(/\p{Cf}/gu, "");
            //insert text manually
            sbiWindow.insertTextAtSelection(text);
        });

        const folderSelect = document.getElementById("sbi-import-select");

        // Add a default option.
        folderSelect.add(new Option("None", ""));

        const actorFolders = [...game.folders]
            .filter(f => f.type === "Actor")
            .map(f => ({ "name": f.name, "id": f._id }));

        // Add the available folders.
        for (const folder of actorFolders) {
            folderSelect.add(new Option(folder.name, folder.id));
        }

        ["blur", "input", "paste"].forEach(eventType => {
            input.addEventListener(eventType, (e) => {
                if (document.getElementById("sbi-import-autoparse").checked) {
                    if (this.keyupParseTimeout) clearTimeout(this.keyupParseTimeout);
                    this.keyupParseTimeout = setTimeout(sbiWindow.parse, e.type == "input" ? 1000 : 0);
                }
            });
        });

        sbiUtils.log("Listeners activated");
    }

    static parse() {
        const input = document.getElementById("sbi-input");

        if (input.innerText.trim().length == 0) return;

        const lines = sbiUtils.stripMarkdownAndCleanInput(input.innerText).split("\n");

        try {
            const { actor, statBlocks, unknownLines } = sbiParser.parseInput(lines);

            if (!statBlocks.size) {
                sbiUtils.error("Unable to parse statblock");
                return {};
            }

            if (unknownLines.length) {
                sbiUtils.warn("Found unaccounted for lines", unknownLines);
            }

            sbiUtils.log("Parsing completed", statBlocks, actor);
            
            // Each line will be its own span, with data attributes indicating their block
            let spanLines = lines.map((line, i) => {
                const block = [...statBlocks.entries()].find(e => e[1].some(l => l.lineNumber == i))?.[0];
                const spanLine = document.createElement("span");
                spanLine.setAttribute("data-line", i);
                spanLine.setAttribute("data-block", block);

                // If the line has matched data, we also surround each matched part with a span
                const matchData = statBlocks.get(block)?.find(l => l.lineNumber == i).matchData || [];
                matchData.sort((a, b) => a.indices[0] - b.indices[0]);

                let encompassingEndDoneIndex = -1;
                for (let md = matchData.length - 1; md >= 0; md--) {
                    const spanStart = matchData[md].indices[0];
                    const spanEnd = matchData[md].indices[1];

                    // We check if this match is inside a "previous" one, like "1st level (4 slots)" where the number of slots is inside the spell group name.
                    // We only manage one level of nesting, it should be enough.
                    const parentSpanIndex = matchData.slice(0, md).findIndex(m => m.indices[1] > spanEnd);
                    if (parentSpanIndex !== -1 && parentSpanIndex !== encompassingEndDoneIndex) {
                        // The "previous" span encompasses this one, and we didn't already process that, so we insert the parent span end first and mark it as done
                        line = [line.slice(0, matchData[parentSpanIndex].indices[1]), "</span>", line.slice(matchData[parentSpanIndex].indices[1])].join("");
                        encompassingEndDoneIndex = parentSpanIndex;
                    }

                    // We only add the span end if it's not been done already
                    if (encompassingEndDoneIndex !== md) {
                        line = [line.slice(0, spanEnd), "</span>", line.slice(spanEnd)].join("");
                    }

                    line = [
                        line.slice(0, spanStart),
                        `<span class="matched" data-tooltip="${Blocks[block].name + ": " + sbiUtils.camelToTitleUpperIfTwoLetters(matchData[md].label)}">`,
                        line.slice(spanStart)
                    ].join("").trim();
                }
                
                spanLine.innerHTML = line;
                return spanLine;
            });

            // Insert the span lines, with headers for each block
            const scrollTop = input.scrollTop;
            input.innerHTML = `<span class="block-header" data-block="Name" contenteditable="false" readonly></span>`;
            input.innerHTML += `<span data-line="-1" data-block="name">` + actor.name + "</span>\n";
            let previousBlock = "";
            spanLines.forEach(l => {
                if (l.getAttribute("data-block") != previousBlock) {
                    input.innerHTML += `<span class="block-header" data-block="${Blocks[l.getAttribute("data-block")]?.name || "???"}" contenteditable="false" readonly></span>`
                    previousBlock = l.getAttribute("data-block");
                }
                input.appendChild(l);
                input.innerHTML += "\n";
            });
            input.scrollTop = scrollTop;

            return { actor, statBlocks };
            
        } catch (error) {
            sbiUtils.error("An error has occured (" + error.stack.split("\n", 1).join("") + "). Please report it using the module link so it can get fixed.", error);
        }
    }

    static async import() {
        sbiUtils.log("Clicked import button");
        const folderSelect = document.getElementById("sbi-import-select");
        const selectedFolderId = folderSelect.options[folderSelect.selectedIndex].value ?? undefined;
        const parseResult = sbiWindow.parse();
        if (parseResult?.actor) {
            const actor5e = await parseResult.actor.createActor5e(selectedFolderId);
            // Open the sheet.
            actor5e.sheet.render(true);
        }
    }

    static insertTextAtSelection(txt) {
        const selectedRange = window.getSelection()?.getRangeAt(0);
        if (!selectedRange || !txt) {
            return;
        }
        selectedRange.deleteContents();
        selectedRange.insertNode(document.createTextNode(txt));
        selectedRange.setStart(selectedRange.endContainer, selectedRange.endOffset);
    }
}
