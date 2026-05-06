const fs = require('fs');
const path = 'src/renderer/src/lib/utils-library.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix the num error
content = content.replace('return `${num}${letter}`;', 'return `${openKeyNum}${letter}`;');

// Add the getOpenKeyColor function
if (!content.includes('getOpenKeyColor')) {
  content += `
export const getOpenKeyColor = (openKey: string | null | undefined): string => {
  if (!openKey) return 'transparent';
  
  const formatted = formatOpenKey(openKey);
  const match = formatted.match(/^([1-9]|1[0-2])[md]$/i);
  if (!match) return 'transparent';
  
  const num = parseInt(match[1], 10);
  const hue = (180 - (num - 1) * 30 + 360) % 360;
  
  return \`hsl(\${hue}, 85%, 55%)\`;
};
`;
}

fs.writeFileSync(path, content, 'utf8');
