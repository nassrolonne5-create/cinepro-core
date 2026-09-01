const HEADERS = {
    'Accept': '*/*',
    'User-Agent': 'curl/7.81.0'
};
fetch('https://embed.vidrift.in/embed/movie/550', { headers: HEADERS })
  .then(res => console.log('Status:', res.status))
  .catch(console.error);
