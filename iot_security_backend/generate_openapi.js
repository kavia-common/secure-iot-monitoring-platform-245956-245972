const fs = require('fs');
const path = require('path');
const swaggerSpec = require('./swagger');

const outputDirectory = path.join(__dirname, 'interfaces');
const outputPath = path.join(outputDirectory, 'openapi.json');

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI specification written to ${outputPath}`);
