const fs = require("fs");
const path = require("path");

function renderTemplate(templateName, variables = {}) {
    const templatePath = path.join(
        __dirname,
        "../templates",
        `${templateName}.html`
    );

    let html = fs.readFileSync(templatePath, "utf8");

    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{{${key}}}}`, "g");
        html = html.replace(regex, value ?? "");
    });

    return html;
}

module.exports = renderTemplate;