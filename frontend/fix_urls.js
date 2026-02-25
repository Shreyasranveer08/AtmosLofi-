const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // First, standardize to localhost:8000
    content = content.replace(/http:\/\/127\.0\.0\.1:8000/g, 'http://localhost:8000');

    // Replace: `http://localhost:8000/api` -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`
    content = content.replace(/`http:\/\/localhost:8000([^`]*)`/g, "`\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}$1`");

    // Replace: 'http://localhost:8000/api' -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`
    content = content.replace(/'http:\/\/localhost:8000([^']*)'/g, "`\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}$1`");

    // Replace: "http://localhost:8000/api" -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`
    content = content.replace(/"http:\/\/localhost:8000([^"]*)"/g, "`\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}$1`");

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
});
