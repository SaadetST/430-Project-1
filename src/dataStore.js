const fs = require('fs');

// link base
const buildLink = (song) => {
    const params = new URLSearchParams({
        search_query: `${song.title} ${song.artist}`,
    });
    return `https://www.youtube.com/results?${params}`;
}

const rawSong = JSON.parse(
  fs.readFileSync(`${__dirname}/../data/songs.json`),
);

// Attaches data to link base
const songs = rawSong.map((song) => ({
  ...song,
  link: buildLink(song),
}));

module.exports = { 
    songs,
    buildLink
};