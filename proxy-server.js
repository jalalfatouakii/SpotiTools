const express = require('express');
const request = require('request');
const path = require('path');
const app = express();
const PORT = 5001;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

app.get('/auth-callback', (req, res) => {
    const accessToken = req.query.access_token;
    res.send(`
        <script>
            window.opener.postMessage({ access_token: '${accessToken}' }, window.location.origin);
            window.close();
        </script>
    `);
});

app.get('/playlists', (req, res) => {
    const accessToken = req.query.access_token;
    const options = {
        url: 'https://api.spotify.com/v1/me/playlists',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    };

    request.get(options, (error, response, body) => {
        if (error) {
            return res.status(500).send(error);
        }
        res.send(body);
    });
});

app.get('/tracks', (req, res) => {
    const accessToken = req.query.access_token;
    const playlistId = req.query.playlist_id;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    const options = {
        url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    };

    request.get(options, (error, response, body) => {
        if (error) {
            return res.status(500).send(error);
        }
        res.send(body);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
