document.addEventListener('DOMContentLoaded', function () {
    const clientId = config.clientId;  // Replace with your Spotify Client ID
    const redirectUri = 'http://localhost:5001/callback';
    const scopes = 'playlist-read-private';

    const loginBtn = document.getElementById('login-btn');
    const playlistsContainer = document.getElementById('playlists-container');
    const playlistsList = document.getElementById('playlists-list');
    const tracksContainer = document.getElementById('tracks-container');
    const tracksList = document.getElementById('tracks-list');
    const changePlaylistBtn = document.getElementById('change-playlist-btn');

    loginBtn.addEventListener('click', function () {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        const authWindow = window.open(authUrl, 'SpotifyAuth', 'width=600,height=400');

        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin) {
                return;
            }
            const accessToken = event.data.access_token;
            if (accessToken) {
                fetchPlaylists(accessToken);
                authWindow.close();
            }
        }, false);
    });

    changePlaylistBtn.addEventListener('click', function () {
        tracksContainer.classList.add('hidden');
        changePlaylistBtn.classList.add('hidden');
        playlistsContainer.classList.remove('hidden');
    });

    function fetchPlaylists(accessToken) {
        fetch(`http://localhost:5001/playlists?access_token=${accessToken}`)
            .then(response => response.json())
            .then(data => {
                const playlists = data.items;
                playlistsContainer.classList.remove('hidden');
                playlistsList.innerHTML = playlists.map(playlist =>
                    `<li><a href="#" data-playlist-id="${playlist.id}">${playlist.name}</a></li>`
                ).join('');

                document.querySelectorAll('#playlists-list a').forEach(a => {
                    a.addEventListener('click', function (event) {
                        event.preventDefault();
                        const playlistId = this.getAttribute('data-playlist-id');
                        fetchAllTracks(accessToken, playlistId);
                    });
                });
                loginBtn.classList.add('hidden');
            })
            .catch(error => console.error('Error fetching playlists:', error));
    }

    function fetchAllTracks(accessToken, playlistId) {
        const limit = 100;
        let offset = 0;
        let allTracks = [];

        function fetchTracks() {
            fetch(`http://localhost:5001/tracks?access_token=${accessToken}&playlist_id=${playlistId}&limit=${limit}&offset=${offset}`)
                .then(response => response.json())
                .then(data => {
                    allTracks = allTracks.concat(data.items);
                    if (data.next) {
                        offset += limit;
                        fetchTracks();
                    } else {
                        fetchGenres(accessToken, allTracks);
                    }
                    playlistsContainer.classList.add('hidden');
                })
                .catch(error => console.error('Error fetching tracks:', error));
        }

        fetchTracks();
    }

    function fetchGenres(accessToken, tracks) {
        const artistIds = Array.from(new Set(tracks.map(item => item.track && item.track.artists && item.track.artists[0].id).filter(Boolean)));

        const artistGenres = {};

        function fetchArtistGenres(artistIds) {
            const artistIdChunk = artistIds.splice(0, 50);
            if (artistIdChunk.length === 0) {
                displayTracks(tracks, artistGenres);
                return;
            }

            fetch(`https://api.spotify.com/v1/artists?ids=${artistIdChunk.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    data.artists.forEach(artist => {
                        artistGenres[artist.id] = artist.genres;
                    });
                    fetchArtistGenres(artistIds);
                })
                .catch(error => console.error('Error fetching artist genres:', error));
        }

        fetchArtistGenres(artistIds);
    }

    function displayTracks(tracks, artistGenres) {
        tracksContainer.classList.remove('hidden');
        changePlaylistBtn.classList.remove('hidden');
        tracksList.innerHTML = tracks
            .filter(item => item.track && item.track.name)  // Filter out invalid tracks
            .map(item => {
                const trackName = item.track.name;
                const artists = item.track.artists.map(artist => artist.name).join(', ');
                const genres = item.track.artists.map(artist => artistGenres[artist.id] ? artistGenres[artist.id].join(', ') : 'Unknown').join(', ');
                return `<li>${trackName} - ${artists} (${genres})</li>`;
            })
            .join('');
    }
});