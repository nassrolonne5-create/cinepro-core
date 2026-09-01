const HEADERS = {
    'Accept': 'text/html',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};
fetch('https://embed.vidrift.in/embed/movie/550', { headers: HEADERS })
  .then(res => console.log('Status:', res.status))
  .catch(console.error);
