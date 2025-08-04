import sortablejs from '../lib/sortable.1.15.6.js';

export const MODULE_NAME = "a5e-statblock-importer";

export function registerSettings() {
    game.settings.registerMenu(MODULE_NAME, "CompendiumOptionsMenu", {
        name: "Compendium Options",
        label: "Compendium Options",
        hint: "Configure Compendium Priority for Spells and Items.",
        icon: "fas fa-book",
        type: CompendiumOptionsMenu,
        restricted: false
    });

    game.settings.register(MODULE_NAME, "compendiums", {
        name: "Compendiums",
        scope: "client",
        config: false,
        type: Object,
        default: {spells: [], items: []},
    });

    game.settings.register(MODULE_NAME, "spellsAsActivities", {
        name: "Import Innate Spells as Activities",
        hint: "If selected, innate spells will be added as cast activities inside the Spellcasting feature. If not selected, they will appear independently in the Spells section of the sheet",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_NAME, "debug", {
        name: "Debug Mode",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });
}

export function getPacks() {
    const compendiumsSetting = game.settings.get(MODULE_NAME, "compendiums");

    const compendiums = game.packs
        .filter(p => p.documentName === "Item")
        .map(p => ({ collection: p.collection, title: p.title }));
    const spellCompendiums = compendiums
        .map(p => {
            const settingInfo = compendiumsSetting.spells.find(s => s.collection === p.collection);
            const priority = settingInfo?.priority ?? 999;
            let active = settingInfo?.active ?? false;
            let disabled = false;
            return { active, priority, disabled, ...p };
        });
    const srdCollection = game.settings.get("a5e", "rulesVersion") === "legacy" ? "a5e.spells" : "a5e.spells24";
    // The appropriate one according to the rules setting will be locked as active.
    let srd = spellCompendiums.find(p => p.collection === srdCollection);
    if (!srd) {
        // This happens in the interim, when the "spells24" one doesn't exist yet.
        srd = spellCompendiums.find(p => p.collection === "a5e.spells");
    }
    srd.active = true;
    srd.disabled = true;
    spellCompendiums.sort((s1, s2) => {
        if (s1.active === s2.active) return s1.priority - s2.priority;
        if (s1.active) return -1;
        return 1;
    });
    const itemCompendiums = compendiums
        .map(p => {
            const settingInfo = compendiumsSetting.items.find(s => s.collection === p.collection);
            const priority = settingInfo?.priority ?? 999;
            const active = settingInfo?.active ?? true;
            return { active, priority, ...p };
        })
        .sort((s1, s2) => {
            if (s1.active === s2.active) return s1.priority - s2.priority;
            if (s1.active) return -1;
            return 1;
        });
    return { spells: spellCompendiums, items: itemCompendiums };
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CompendiumOptionsMenu extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "sbi-compendium-options-menu",
        position: { width: 700, height: 700 },
        classes: ["sbi-options-menu"],
        window: {
            resizable: true,
            title: "A5e Statblock Importer - Compendium Options"
        },
        actions: {
            confirm: this.confirm,
            cancel: this.cancel
        }
    };

    static PARTS = {
        header: {
            template: `../modules/${MODULE_NAME}/templates/sbiCompendiumOptionsHeader.hbs`
        },
        form: {
            template: `../modules/${MODULE_NAME}/templates/sbiCompendiumOptions.hbs`,
            scrollable: [""]
        },
        footer: {
            template: `../modules/${MODULE_NAME}/templates/sbiCompendiumOptionsFooter.hbs`
        }
    }

    _prepareContext(options) {
        return {compendiums: getPacks()};
    }

    _onRender(context, options) {
        const sortableOptions = {
            animation: 150,
        };
        const spellCompendiumsList = document.getElementById("sbi-spell-compendiums");
        const spellsSortable = sortablejs.create(spellCompendiumsList, sortableOptions);
        const itemCompendiumsList = document.getElementById("sbi-item-compendiums");
        const itemSortable = sortablejs.create(itemCompendiumsList, sortableOptions);
    }

    static confirm() {
        let compendiums = {spells: [], items: []};
        const spellsList = document.getElementById("sbi-spell-compendiums");
        compendiums.spells = [...spellsList.querySelectorAll("input")]
            .sort((s1, s2) => {
                if (s1.checked === s2.checked) return 0;
                if (s1.checked) return -1;
                return 1;
            })
            .map((el, i) => ({
                collection: el.getAttribute("data-id"),
                active: el.checked,
                priority: i
            }));
        const itemsList = document.getElementById("sbi-item-compendiums");
        compendiums.items = [...itemsList.querySelectorAll("input")]
            .sort((s1, s2) => {
                if (s1.checked === s2.checked) return 0;
                if (s1.checked) return -1;
                return 1;
            })
            .map((el, i) => ({
                collection: el.getAttribute("data-id"),
                active: el.checked,
                priority: i
            }));
        game.settings.set(MODULE_NAME, "compendiums", compendiums);
        this.close();
    }
    
    static cancel() {
        this.close();
    }
}
