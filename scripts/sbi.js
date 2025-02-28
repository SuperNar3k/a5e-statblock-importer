import { registerSettings } from "./sbiConfig.js";
import { sbiUtils } from "./sbiUtils.js";
import { sbiWindow } from "./sbiWindow.js";

Hooks.on("init", registerSettings);

Hooks.on("renderActorDirectory", (app, html, data) => {
    sbiUtils.log("Rendering SBI button");
    html = html instanceof jQuery ? html.get(0) : html;
    const importButton = document.createElement("button");
    importButton.id = "sbi-main-button";
    importButton.setAttribute("type", "button")
    importButton.innerHTML = `<i class="fas fa-file-import"></i>Import Statblock`;
    importButton.addEventListener("click", () => {
        sbiUtils.log("SBI button clicked");
        sbiWindow.renderWindow();
    });
    html.querySelector(".directory-footer").appendChild(importButton);
});