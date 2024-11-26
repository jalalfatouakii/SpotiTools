const stringurl = 'https://spotitools.onrender.com/';
let clientId = '';
async function fetchClientId() {
    try {
      
      const response = await fetch("https://backend-spotitools.onrender.com/api/client-id");
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data = await response.json();
      clientId = data.clientId; // Assuming the response has a "clientId" field
    } catch (error) {
      console.error('Error fetching Client ID:', error);
    }
  }

document.addEventListener('DOMContentLoaded',async function () {
    
    await fetchClientId();
       // Replace with your Spotify Client ID
    const redirectUri = 'http://192.168.1.144:5001/callback';
    const scopes = 'playlist-read-private playlist-modify-public playlist-modify-private';

    const loginBtn = document.getElementById('login-btn');
    const titre = document.getElementById('titre');
    const txtlog = document.getElementById('txtlog');
    const playlistsContainer = document.getElementById('playlists-container');
    const playlistsList = document.getElementById('playlists-list');
    const tracksContainer = document.getElementById('tracks-container');
    const tracksList = document.getElementById('tracks-list');
    const changePlaylistBtn = document.getElementById('change-playlist-btn');
    const filterContainer = document.getElementById('filter-container');
    const filterInput = document.getElementById('filter-input');
    const filterArtistBtn = document.getElementById('filter-artist-btn');
    const filterGenreBtn = document.getElementById('filter-genre-btn');
    const savePlaylistBtn = document.createElement('button');
    const clearFilterBtn = document.createElement('button'); // Clear filter button

    savePlaylistBtn.innerText = 'Save to Spotify';
    savePlaylistBtn.id = 'save-playlist-btn';
    savePlaylistBtn.classList.add('hidden');
    document.getElementById("changement").appendChild(savePlaylistBtn);

    clearFilterBtn.innerText = 'Clear Filters';
    clearFilterBtn.id = 'clear-filter-btn';
    clearFilterBtn.classList.add('hidden');
    document.getElementById("changement").appendChild(clearFilterBtn);

    let accessToken = '';
    let userId = '';
    let currentPlaylistName = '';
    let filteredTracksUris = [];
    let allTracks = [];
    let artistGenres = {};
    let selectedFilters = { artists: [], genres: [] }; // Store selected filters

    loginBtn.addEventListener('click', function () {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        const authWindow = window.open(authUrl, 'SpotifyAuth', 'width=600,height=400');

        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin) {
                return;
            }
            accessToken = event.data.access_token;
            if (accessToken) {
                fetchPlaylists(accessToken);
                authWindow.close();
                fetchUserId(accessToken);
            }
        }, false);
    });

    changePlaylistBtn.addEventListener('click', function () {
        tracksList.innerHTML = '';  // Clear the displayed tracks
        tracksContainer.classList.add('hidden');
        changePlaylistBtn.classList.add('hidden');
        filterContainer.classList.add('hidden');
        savePlaylistBtn.classList.add('hidden');
        clearFilterBtn.classList.add('hidden');
        playlistsContainer.classList.remove('hidden');


        // Reset filter input and hide genre/artist tables
        filterInput.value = '';
        document.getElementById('genres-table').classList.add('hidden');
        document.getElementById('artists-table').classList.add('hidden');
        
        // Clear selected filters
        selectedFilters = { artists: [], genres: [] };

        // Remove buttons for open Spotify and iframe
        const openSpotifyBtn = document.getElementById('open-spotify-btn');
        const filda = document.getElementById('filda');
        if (openSpotifyBtn) openSpotifyBtn.remove();
        if (filda) filda.remove();
    });

    filterArtistBtn.addEventListener('click', function () {
        filterTracks();
    });

    filterGenreBtn.addEventListener('click', function () {
        filterTracks();
    });

    clearFilterBtn.addEventListener('click', function () {
        // Clear selected filters
        selectedFilters = { artists: [], genres: [] };
        document.querySelectorAll('.genre-btn, .artist-btn').forEach(btn => btn.classList.remove('selected'));
        filterInput.value = '';
        filterTracks();
        clearFilterBtn.classList.add('hidden');
        
    });

    savePlaylistBtn.addEventListener('click', function () {
        saveFilteredPlaylist();
    });

    function fetchPlaylists(accessToken) {
        fetch(`http://192.168.1.144:5001/playlists?access_token=${accessToken}`)
            .then(response => response.json())
            .then(data => {
                const playlists = data.items;
                playlistsContainer.classList.remove('hidden');
                playlistsList.innerHTML = playlists.map(playlist =>
                    `<li><a href="#" data-playlist-id="${playlist.id}" data-playlist-name="${playlist.name}">${playlist.name}</a></li>`
                ).join('');

                document.querySelectorAll('#playlists-list a').forEach(a => {
                    a.addEventListener('click', function (event) {
                        event.preventDefault();
                        const playlistId = this.getAttribute('data-playlist-id');
                        currentPlaylistName = this.getAttribute('data-playlist-name');
                        fetchAllTracks(accessToken, playlistId);
                    });
                });
                loginBtn.classList.add('hidden');
                txtlog.classList.add('hidden');
                titre.classList.add('hidden');

            })
            .catch(error => console.error('Error fetching playlists:', error));
    }

    function fetchAllTracks(accessToken, playlistId) {
        const limit = 100;
        let offset = 0;
        allTracks = [];
    
        function fetchTracks() {
            fetch(`http://192.168.1.144:5001/tracks?access_token=${accessToken}&playlist_id=${playlistId}&limit=${limit}&offset=${offset}`)
                .then(response => response.json())
                .then(data => {
                    allTracks = allTracks.concat(data.items.filter(item => 
                        item.track && 
                        item.track.artists && 
                        item.track.artists.length > 0 // Ensure there are artists
                    ));
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
        const artistIds = Array.from(new Set(tracks
            .filter(item => item.track && item.track.artists && item.track.artists.length > 0)
            .flatMap(item => item.track.artists.map(artist => artist.id))
            .filter(Boolean)
        ));
    
        artistGenres = {};
    
        function fetchArtistGenres(artistIds) {
            const artistIdChunk = artistIds.splice(0, 50);
            if (artistIdChunk.length === 0) {
                displayFilterOptions();
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
                        if (artist && artist.id && artist.genres) {
                            artistGenres[artist.id] = artist.genres;
                        }
                    });
                    fetchArtistGenres(artistIds);
                })
                .catch(error => {
                    console.error('Error fetching artist genres:', error);
                    fetchArtistGenres(artistIds); // Continue fetching even if there's an error
                });
        }
        
    
        fetchArtistGenres(artistIds);
    }

    function displayFilterOptions() {
        changePlaylistBtn.classList.remove('hidden');
        tracksContainer.classList.remove('hidden');
        clearFilterBtn.classList.remove('hidden');

        // Display unique genres
        const uniqueGenres = [...new Set(allTracks.flatMap(item => {
            return item.track.artists.flatMap(artist => artistGenres[artist.id] || []);
        }))];

        const genresTable = document.getElementById('genres-table');
        genresTable.classList.remove('hidden');
        genresTable.innerHTML = `<strong>Genres:</strong> ${uniqueGenres.map(genre => `<button class="genre-btn">${genre}</button>`).join(' ')}`;

        // Display unique artists
        const uniqueArtists = [...new Set(allTracks.flatMap(item => item.track.artists.map(artist => artist.name)))];

        const artistsTable = document.getElementById('artists-table');
        artistsTable.classList.remove('hidden');
        artistsTable.innerHTML = `<strong>Artists:</strong> ${uniqueArtists.map(artist => `<button class="artist-btn">${artist}</button>`).join(' ')}`;

        // Add click event listeners for genre buttons
        document.querySelectorAll('.genre-btn').forEach(button => {
            button.addEventListener('click', function () {
                this.classList.toggle('selected');
                const genre = this.textContent;
                if (this.classList.contains('selected')) {
                    selectedFilters.genres.push(genre);
                } else {
                    selectedFilters.genres = selectedFilters.genres.filter(g => g !== genre);
                }
                filterTracks();
            });
        });

        // Add click event listeners for artist buttons
        document.querySelectorAll('.artist-btn').forEach(button => {
            button.addEventListener('click', function () {
                this.classList.toggle('selected');
                const artist = this.textContent;
                if (this.classList.contains('selected')) {
                    selectedFilters.artists.push(artist);
                } else {
                    selectedFilters.artists = selectedFilters.artists.filter(a => a !== artist);
                }
                filterTracks();
            });
        });
    }

    function filterTracks() {
        const inputText = filterInput.value.toLowerCase();
    
        filteredTracksUris = allTracks.filter(item => {
            const trackNameMatch = item.track.name.toLowerCase().includes(inputText);
            const artistMatch = selectedFilters.artists.length === 0 || selectedFilters.artists.every(selectedArtist => item.track.artists.some(artist => artist.name === selectedArtist));
            const genreMatch = selectedFilters.genres.length === 0 || selectedFilters.genres.every(selectedGenre => item.track.artists.some(artist => (artistGenres[artist.id] || []).includes(selectedGenre)));
    
            return trackNameMatch && artistMatch && genreMatch;
        }).map(item => item.track.uri);
    
        displayTracks(allTracks.filter(item => filteredTracksUris.includes(item.track.uri)));
    
        // Show the save button if there are filtered tracks
        if (filteredTracksUris.length > 0) {
            savePlaylistBtn.classList.remove('hidden');
        } else {
            savePlaylistBtn.classList.add('hidden');
        }
    }
    

    function displayTracks(tracks) {
        // Check if any filter buttons are selected
        const anyFilterSelected = document.querySelector('.genre-btn.selected, .artist-btn.selected') !== null;
    
        // If no filters are selected, clear the track list and hide the save button
        if (!anyFilterSelected) {
            tracksList.innerHTML = '';
            savePlaylistBtn.classList.add('hidden');
            return;
        }
    
        // Display tracks if filters are active
        tracksList.innerHTML = tracks
            .filter(item => item.track && item.track.name && item.track.artists && item.track.artists.length > 0)
            .map(item => {
                const track = item.track;
                const trackName = track.name;
                const artists = track.artists
                    .filter(artist => artist.id && artistGenres[artist.id])
                    .map(artist => artist.name)
                    .join(', ');
                const genres = track.artists
                    .flatMap(artist => artistGenres[artist.id] || [])
                    .join(', ');
                return `<li>${trackName} - ${artists}</li>`;
            })
            .join('');
    
        // Show the save button if tracks are displayed
        savePlaylistBtn.classList.remove('hidden');
    }
    
    

    function fetchUserId(accessToken) {
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                userId = data.id;
            })
            .catch(error => console.error('Error fetching user ID:', error));
    }

    function saveFilteredPlaylist() {
        const newPlaylistName = `${currentPlaylistName} (Filtered)`;
        fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newPlaylistName,
                description: `Filtered playlist of ${currentPlaylistName}. By Filterify!`,
                public: false
            })
        })
            .then(response => response.json())
            .then(data => {
                const newPlaylistId = data.id;
                addTracksToPlaylist(newPlaylistId);
            })
            .catch(error => console.error('Error creating new playlist:', error));
    }

    function addTracksToPlaylist(playlistId) {
        const trackUrisChunked = [];
        for (let i = 0; i < filteredTracksUris.length; i += 100) {
            trackUrisChunked.push(filteredTracksUris.slice(i, i + 100));
        }

        function addTracks(chunkIndex) {
            if (chunkIndex >= trackUrisChunked.length) {
                return;
            }
            fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: trackUrisChunked[chunkIndex]
                })
            })
                .then(() => addTracks(chunkIndex + 1))
                .catch(error => console.error('Error adding tracks to playlist:', error));
        }

        addTracks(0);

        // Add button to open the playlist in Spotify
        if (!document.getElementById('open-spotify-btn')) {
            const openSpotifyBtn = document.createElement('button');
            openSpotifyBtn.innerText = 'Open in Spotify';
            openSpotifyBtn.id = 'open-spotify-btn';
            openSpotifyBtn.addEventListener('click', function () {
                window.open(`https://open.spotify.com/playlist/${playlistId}`, '_blank');
            });
            document.getElementById("changement").appendChild(openSpotifyBtn);
        }

        // Add iframe to play the playlist
        if (!document.getElementById('filda')) {
            const filda = document.createElement('div');
            filda.id = 'filda';
            filda.innerHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator" width="100%" height="380" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
            document.getElementById("changement").appendChild(filda);
        }
        alert('Filtered playlist saved to Spotify!');
    }

});