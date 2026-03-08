const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}

const files = getAllFiles('src/pages').concat(getAllFiles('src/components'));

const replaceMap = [
    { from: /text-white\/90/g, to: 'text-text' },
    { from: /text-white\/70/g, to: 'text-text-muted' },
    { from: /text-white(?=[\s"'`}])/g, to: 'text-text' },
    { from: /text-slate-300|text-slate-400|text-slate-500/g, to: 'text-text-muted' },
    { from: /bg-white\/5|bg-white\/10/g, to: 'bg-surface-alt' },
    // Do not replace border-white/20, wait, replace border-white/10
    { from: /border-white\/10|border-white\/20|border-border\/30|border-slate-600|border-slate-700/g, to: 'border-border' },
    { from: /hover:bg-white\/5|hover:bg-white\/10/g, to: 'hover:bg-border' },
    { from: /hover:text-white/g, to: 'hover:text-text' },
    { from: /bg-\[#16212b\]/g, to: 'bg-surface' },
    { from: /from-white/g, to: 'from-text' },
    { from: /fill-white/g, to: 'fill-current' },
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const initial = content;

    replaceMap.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    // Custom fixes: when a string has bg-primary, bg-red-500, bg-green-500 etc. text should be white
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        // Revert "text-text" back to "text-white" on buttons with primary colors
        if (lines[i].match(/(bg-primary|bg-red-|bg-green-|bg-emerald|bg-orange-)/)) {
            lines[i] = lines[i].replace(/text-text/g, 'text-white');
        }
        // Also revert text-text-muted on buttons
        if (lines[i].match(/(bg-primary|bg-red-|bg-green-|bg-emerald|bg-orange-)/)) {
            lines[i] = lines[i].replace(/text-white-muted/g, 'text-white/70');
        }
    }
    content = lines.join('\n');

    if (content !== initial) {
        fs.writeFileSync(f, content);
    }
});
