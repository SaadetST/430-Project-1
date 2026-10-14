const fs = require('fs');

const buildLink = (song) => {
    const params = new URLSearchParams({
        search_query: `${song.title} ${song.artist}`,
    });
    return `https://www.youtube.com/results?${params}`;
}

const rawSong = JSON.parse(
  fs.readFileSync(`${__dirname}/../data/songs.json`),
);

const songs = rawSong.map((song) => ({
  ...song,
  link: buildLink(song),
}));

const titles = (song) => song.title;
const artists = (song) => song.artist;
const links = (song) => song.link;
const genres = (song) => song['top genre'];

//console.log(buildLink(songs[0]));
//console.log(songs[0]);

module.exports = { 
    songs,
    titles,
    artists,
    links,
    genres,
    buildLink
};