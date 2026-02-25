const fs = require('fs');

const files = [
    'src/app/page.tsx',
    'src/components/Player.tsx',
    'src/components/PricingModal.tsx'
];

files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    const layer3 = "`\\${process.env.NEXT_PUBLIC_API_URL || `\\${process.env.NEXT_PUBLIC_API_URL || `\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`}`}`";
    const layer2 = "`\\${process.env.NEXT_PUBLIC_API_URL || `\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`}`";
    const layer1 = "`\\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`";
    const clean = "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`";

    code = code.split(layer3).join(clean);
    code = code.split(layer2).join(clean);
    code = code.split(layer1).join(clean);

    if (code !== original) {
        fs.writeFileSync(file, code, 'utf8');
        console.log('Cleaned', file);
    }
});
