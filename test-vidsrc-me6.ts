async function run() {
    const res = await fetch('https://cloudorchestranova.com/embed/movie/550?vs=GzBl2SBPY7dz2uEoPSIr4SMtmZtjAVWrFLkoSUlRbXtn9pcbmi0Drpoo4Lj8DQqSS4DysQjcKkdrJgup4iBf2mk1MY77nCNAR6s', {
        headers: {
            'Referer': 'https://vidsrc.me/'
        }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("Response length:", html.length);
    console.log("Sample:", html.substring(0, 200));
}
run();
