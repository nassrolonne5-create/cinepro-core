fetch('https://corsproxy.io/?' + encodeURIComponent('https://embed.vidrift.in/embed/movie/550'))
  .then(res => console.log('Status:', res.status))
  .catch(console.error);
