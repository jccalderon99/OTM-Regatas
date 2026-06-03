const fs = require('fs');
const vm = require('vm');

function checkFile(filepath) {
    console.log(`Checking ${filepath}...`);
    const content = fs.readFileSync(filepath, 'utf8');
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let index = 0;
    while ((match = scriptRegex.exec(content)) !== null) {
        const js = match[1];
        if (js.trim().length === 0) continue;
        try {
            new vm.Script(js, { filename: `${filepath} [script ${index}]` });
            console.log(`  Script ${index} is syntactically correct.`);
        } catch (e) {
            console.error(`  Error in Script ${index}:`, e);
        }
        index++;
    }
}

checkFile('public/reports/dashboard-externo.html');
checkFile('public/reports/dashboard-interno.html');
