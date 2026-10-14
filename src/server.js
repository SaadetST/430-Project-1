const http = require('http');
const fs = require('fs');
const query = require('querystring');
const { songs, buildLink } = require('./dataStore.js');
//console.log(songs[0]); //undefined

const index = fs.readFileSync(`${__dirname}/../client/client.html`);
const css = fs.readFileSync(`${__dirname}/../client/style.css`);
const docs = fs.readFileSync(`${__dirname}/../client/docs.html`);

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const optionalFields = {
  year: (s) => s.year,
  genre: (s) => s['top genre'],
  duration: (s) => s.audio?.dur,
  link: (s) => s.link,
};

const respond = (request, response, status, type, content) => {
    const body = (typeof content === 'string' || Buffer.isBuffer(content))
      ? content : JSON.stringify(content);    
    
      response.writeHead(status, {
      'Content-Type': type,
      'Content-Length': Buffer.byteLength(body),
    });

    if (request.method !== 'HEAD')
        response.write(body);

    console.log(`Status:${status}, Content-Lenght: ${body}`);
    response.end();
};

const getSong = (request, response, params) => {
    const wantedTitle = params.get('title');
    //console.log(params);
    //console.log(wantedTitle);

    if (!wantedTitle) {
        return respond(request, response, 400, 'application/json', {
          message: 'title query parameter is required',
          id: 'missingParams',
        });
    }

    const match = songs.find((s) => String(s.title).toUpperCase() === wantedTitle.toUpperCase());
    //console.log(match);
    
    if(!match){
        return respond(request, response, 404, 'application/json', {
            message: 'Song not found',
            id: 'notFound',
        });
    }
    
    const result = { 
        title: match.title, 
        artist: match.artist 
    };
    
    //console.log(result);
    
    const checkedParams = params.getAll('show');

    for (let i = 0; i < checkedParams.length; i++) {
        const field = checkedParams[i];
        
        if (optionalFields[field]) {
          result[field] = optionalFields[field](match);
        }
    }

    //console.log(result);

    return respond(request, response, 200, 'application/json', result);
}

const getIndex = (request, response) => {
    respond(request,response, 200, 'text/html', index);
};

const getTitles = (request, response) => {
    const allTitles = sendUnique((song) => song.title);
    respond(request,response, 200, 'application/json', allTitles);
};

const getArtists = (request, response) => {
    const allArtists = sendUnique((song) => song.artist);
    respond(request,response, 200, 'application/json', allArtists);
};

const getGenres = (request, response) => {
    const allYears = sendUnique((song) => song["top genre"]);
    respond(request,response, 200, 'application/json', allYears);
};

const addSong = (request, response) => saveSong(request, response, false);

const editSong = (request, response) => saveSong(request, response, true);

const notFound = (request, response) => {
    const body = JSON.stringify({
      message: 'The page you are looking for was not found.',
      id: 'notFound',
    });
    respond(request, response, 404, 'application/json', body);
};

const saveSong = (request, response, isEdit) => {
    const body = [];    
    request.on('data', (chunk) => {
      body.push(chunk);
    });

    request.on('end', () => {
        const bodyString = Buffer.concat(body).toString();
        const bodyParams = query.parse(bodyString);

        const { title, artist, year, genre, duration } = bodyParams;

        if (!title) {
          return respond(request, response, 400, 'application/json', {
            message: 'Song title required.',
            id: 'missingParams',
          });
        }

        if (!isEdit && !artist) {
            return respond(request, response, 400, 'application/json', {
                message: 'Song artist required.',
                id: 'missingParams',
            });
        }   

        const match = songs.find((s) => String(s.title).toUpperCase() === title.toUpperCase());

        if (match) {
            if (!isEdit || artist){
                match.artist = artist;
                match.link = buildLink(match); 
            } 
            if (!isEdit || !genre) match['top genre'] = genre;
            if (!isEdit || !year) match.year = Number(year);
            if (!isEdit || !duration) match.audio.dur = Number(duration);

            response.writeHead(204);
            console.log(`Status:${204} Content-Length:0`);
            return response.end();
        }

        if (isEdit) {
            return respond(request, response, 404, 'application/json', {
                message: 'Song not found.',
                id: 'notFound',
            });
        }

        const newSong = {
            title, 
            artist,
            year: Number(year) || '',
            'top genre': genre,
            audio: { dur: Number(duration) || 0 },
        };

        newSong.link = buildLink(newSong);

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
        if (path === '/editSong') {
            return editSong(request, response);
        }
        return notFound(request, response);
    }

    switch (path) {
        case '/':
          return getIndex(request, response);
        case '/style.css':
            return respond(request, response, 200, 'text/css', css);
        case '/docs.html':
            return respond(request, response, 200, 'text/html', docs);
        case '/titles':
            return getTitles(request, response);
        case '/artists':
            return getArtists(request, response);
        case '/genres':
            return getGenres(request, response);
        case '/searchTitle': // link should include ?title=Alejandro in test
            return getSong(request, response, params);
        default:
            return notFound(request,response);
    }
};

const sendUnique = (getValue) => {
  const unique = [];

  for (let i = 0; i < songs.length; i++) {
    const value = getValue(songs[i]);

    if (!unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique;
};

http.createServer(onRequest).listen(port, () => {
  console.log(`Listening on 127.0.0.1: ${port}`);
});