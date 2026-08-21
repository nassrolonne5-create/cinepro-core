import fetch from 'node-fetch';

async function run() {
  const res = await fetch("http://localhost:3000/v1/movies/550");
  const data = await res.json();
  const vf = data.sources.find(s => s.provider.name.toLowerCase() === 'vidfast');
  if (vf) {
    console.log("Found vidfast, testing proxy URL:");
    const proxyRes = await fetch(vf.url);
    console.log("Status:", proxyRes.status);
  } else {
    console.log("No vidfast found");
  }
}
run();
