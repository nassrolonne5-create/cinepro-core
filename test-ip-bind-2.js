import https from 'https';

const url = "https://bcdn.hakunaymatata.com/resource/h265/684b24b1596a134d0b7fad6a74fa3d70.mp4?sign=0f459b03df7729dcb2a8679bd1708991&t=1788298027";

https.get(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
    headers: { 'User-Agent': 'curl/8.5.0' }
}, (res) => {
    let data = '';
    res.on('data', chunk => data+=chunk);
    res.on('end', () => console.log(data.substring(0, 500)));
});
