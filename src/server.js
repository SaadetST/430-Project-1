const http = require('http');
const fs = require('fs');
const query = require('querystring');
const { songs, titles, artists, links, years } = require('./dataStore.js');
//console.log(songs[0]); //undefined

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const respond = (request, response, status, type, content) => {
    //const body = JSON.stringify(content);
    const length = Buffer.byteLength(content, 'utf8');
    response.writeHead(status, { 
        'Content-Type': type,
        'Content-Length': length,
    });

    if (request.method !== 'HEAD')
        response.write(content);

    console.log(`Status:${status}, Content-Lenght: ${length}`);
    response.end();
};

const getSong = (request, response, params) => {
    const wantedTitle = params.get('title');
    console.log(params);
    console.log(wantedTitle);
    // params will also include different ways to search for a song (artist, year, etc)
    // just title for now

    if (!wantedTitle) {
        return respond(request, response, 400, 'application/json', {
          message: 'title query parameter is required',
          id: 'missingParams',
        });
    }

    const match = songs.find((s) => String(s.title).toUpperCase() === wantedTitle.toUpperCase());
    console.log(match);


    if(match === ''){
        return respond(request, response, 404, 'application/json', {
            message: 'Song not found',
            id: 'notFound',
        });
    }

    return respond(request, response, 200, 'application/json', match);
}

const getIndex = (request, response) => {
    respond(request,response, 200, 'text/html', index);
};

const getTitle = (request, response) => {
    const allTitles = songs.map(titles);
    respond(request,response, 200, 'application/json', allTitles);
};

const getArtist = (request, response) => {
    const allArtists = songs.map(artists);
    respond(request,response, 200, 'application/json', allArtists);
};

const getLink = (request, response) => {
    const allLinks = songs.map(links);
    respond(request,response, 200, 'application/json', allLinks);
};

const getYear = (request, response) => {
    const allYears = songs.map(years);
    respond(request,response, 200, 'application/json', allYears);
};

const notFound = (request, response) => {
    respond(request,response, 404, 'application/json', {
        message: 'The page you are looking for was not found.',
        id: 'notFound',
    });
};

const addSong = (request, response) => {
  const body = [];

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    const bodyString = Buffer.concat(body).toString();
    const bodyParams = query.parse(bodyString);

    const { title, artist } = bodyParams;

    if (!title || !artist) {
      return respond(request, response, 400, 'application/json', {
        message: 'Song title and artist is required.',
        id: 'missingParams',
      });
    }

    const match = songs.find((s) => String(s.title).toUpperCase() === title.toUpperCase());

    if (match) {
        match.artist = artist;
        response.writeHead(204);
        console.log(`Status:${204} Content-Length:0`);
        return response.end();
    }

    const newSong = {title, artist};
    songs.push(newSong);
    return respond(request, response, 201, 'application/json', newSong);
  });
};

const onRequest = (request,response) => {
    const parsedUrl = new URL(request.url, 'http://${request.headers.host}');
    const path = parsedUrl.pathname;
    const params = parsedUrl.searchParams;

    // handles POST
    if (request.method === 'POST') {
        if (path === '/addSong') {
          return addSong(request, response);
        }
        return notFound(request, response);
    }

    switch (path) {
        case '/':
          return getIndex(request, response);
        case '/titles':
            return getTitle(request, response);
        case '/artists':
            return getArtist(request, response);
        case '/links':
            return getLink(request, response);
        case '/years':
            return getYear(request, response);
        case '/searchTitle': // link should include ?title=Alejandro in test
            return getSong(request, response, params);
        case '/addSong':
            return addSong(request, response);
        default:
            return notFound(request,response);
    }
};

http.createServer(onRequest).listen(port, () => {
  console.log(`Listening on 127.0.0.1: ${port}`);
});