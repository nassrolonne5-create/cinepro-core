import fs from 'fs';
const data = require('./test-health3.json');
console.log('Sources:', data.sources?.length);
const providers = [...new Set(data.sources?.map((s: any) => s.provider.id))];
console.log('Providers:', providers);
