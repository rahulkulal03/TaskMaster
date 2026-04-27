const fs = require('fs');
const https = require('https');

async function getDirectUrl() {
  try {
    const res = await fetch('https://pdftolink.io/file/r2_dXNlcnMvZ3Vlc3QvNGQ0Yzk0YzQtNDZlOC00OWYxLWFjNjYtYmRhY2E5ZGZmNTgyLm1wMw');
    const html = await res.text();
    // try to find audio src
    const match = html.match(/src="([^"]+\.mp3[^"]*)"/i) || html.match(/href="([^"]+\.mp3[^"]*)"/i);
    
    if (match) {
        console.log("Found:", match[1]);
        const audioUrl = 'https://pdftolink.io' + match[1]; // or might be absolute already
        fetchAndSave(match[1].startsWith('http') ? match[1] : ('https://pdftolink.io' + match[1]));
    } else {
        // Just extract all urls
        const urls = html.match(/(https?:\/\/[^\s"'<>]+)/gi);
        console.log("URLs found:", urls.filter(u => u.includes('mp3') || u.includes('file')));
    }
  } catch (e) {
    console.error(e);
  }
}
async function fetchAndSave(url) {
    console.log("Downloading from", url);
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync('./public/fhaaaa.mp3', Buffer.from(buffer));
    console.log("Saved to public/fhaaaa.mp3");
}
getDirectUrl();
