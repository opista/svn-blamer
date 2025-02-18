import fs from "fs";
import path from "path";

const generateDistinctColor = (index) => {
    const goldenRatio = 0.618033988749895;

    const hue = (index * goldenRatio * 360) % 360;

    const saturation = 85 + Math.random() * 15;
    const lightness = 45 + Math.random() * 20;

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
};

const createSvgContent = (color) => {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" fill="${color}" r="30"/></svg>`;
};

export const generateIndicators = (count) => {
    const outputDir = path.join("src", "img", "indicators");

    // Check if directory exists and has files
    if (fs.existsSync(outputDir)) {
        const existingFiles = fs.readdirSync(outputDir).filter((file) => file.endsWith(".svg"));
        if (existingFiles.length) {
            return;
        }
    }

    fs.mkdirSync(outputDir, { recursive: true });

    const colors = new Set();
    let index = 0;

    while (colors.size < count) {
        colors.add(generateDistinctColor(index));
        index++;
    }

    colors.forEach((color) => {
        const safeFileName = color
            .replace("hsl(", "")
            .replace(")", "")
            .replace(/, /g, "-")
            .replace(/%/g, "");
        const fileName = path.join(outputDir, `${safeFileName}.svg`);
        fs.writeFileSync(fileName, createSvgContent(color));
    });
};
