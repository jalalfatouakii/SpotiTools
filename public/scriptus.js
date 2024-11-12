const stringurl = 'https://spotitools.onrender.com/';
let clientId = '';
async function fetchClientId() {
    try {
      
      const response = await fetch(`${stringurl}api/client-id`);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(data);
      console.log(data.client_id)
      clientId = data.client_id; // Assuming the response has a "clientId" field
      //console.log('Client ID fetched successfully:', clientId);
    } catch (error) {
      console.error('Error fetching Client ID:', error);
    }
  }

document.addEventListener('DOMContentLoaded',async function () {
    // 'http://localhost:5001/';
    
      // Replace with your Spotify Client ID
    await fetchClientId();
    const redirectUri = `${stringurl}callback`;
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
    const selectSort = document.getElementById('select-sort');
    const selectSortA = document.getElementById('select-sort-g');
    const savePlaylistBtn = document.createElement('button');
    const clearFilterBtn = document.createElement('button'); // Clear filter button

    let sortingselect = true;
    const afficheListe = document.getElementById('affiche');

    savePlaylistBtn.innerText = 'Save to Spotify';
    savePlaylistBtn.id = 'save-playlist-btn';
    savePlaylistBtn.classList.add('hidden');
    document.getElementById("changement").appendChild(savePlaylistBtn);

    clearFilterBtn.innerText = 'Clear Filters';
    clearFilterBtn.id = 'clear-filter-btn';
    clearFilterBtn.classList.add('hidden');
    document.getElementById("changement2").appendChild(clearFilterBtn);

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
        selectSort.classList.add('hidden');
        selectSortA.classList.add('hidden');



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
    selectSort.addEventListener('click', function () {
        sortingselect = !sortingselect; // Toggle the sorting method
        if (sortingselect) {
            selectSort.textContent = 'Toggle "AND" filtering for Artists';
        } else {
            selectSort.textContent = 'Toggle "OR" filtering for Artists';
        }
        filterTracks();
    });
    let sortingselectA = true;
    selectSortA.addEventListener('click', function () {
        sortingselectA = !sortingselectA; // Toggle the sorting method
        if (sortingselectA) {
            selectSortA.textContent = 'Toggle "AND" filtering for Genres';
        } else {
            selectSortA.textContent = 'Toggle "OR" filtering for Genres';
        }
        filterTracks();
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
        savePlaylistBtn.classList.add('hidden');
        afficheListe.classList.add('hidden');
        
    });

    savePlaylistBtn.addEventListener('click', function () {
        saveFilteredPlaylist();
        selectSort.classList.add('hidden');
        selectSortA.classList.add('hidden');
    });

    function fetchPlaylists(accessToken) {
        fetch(`${stringurl}playlists?access_token=${accessToken}`)
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
            fetch(`${stringurl}tracks?access_token=${accessToken}&playlist_id=${playlistId}&limit=${limit}&offset=${offset}`)
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
        //selectSort.classList.remove('hidden');
        //selectSortA.classList.remove('hidden');

        // Display unique genres
        const uniqueGenres = [...new Set(allTracks.flatMap(item => {
            return item.track.artists.flatMap(artist => artistGenres[artist.id] || []);
        }))];

        const genresTable = document.getElementById('genres-table');
        genresTable.classList.remove('hidden');
        genresTable.innerHTML = `<button class="hiding" id="hidgen"> Hide </button><button class="hiding hidden" id="hidgenn"> Show </button><strong>Genres:</strong> ${uniqueGenres.map(genre => `<button class="genre-btn">${genre}</button>`).join(' ')}`;

        // Display unique artists
        const uniqueArtists = [...new Set(allTracks.flatMap(item => item.track.artists.map(artist => artist.name)))];

        const artistsTable = document.getElementById('artists-table');
        artistsTable.classList.remove('hidden');
        artistsTable.innerHTML = `<button class="hiding" id="hidart"> Hide </button><button class="hiding hidden" id="hidartt"> Show </button><strong>Artists:</strong> ${uniqueArtists.map(artist => `<button class="artist-btn">${artist}</button>`).join(' ')}`;

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
            //console.log(selectedFilters.artists, "full");
            
            let artistMatch;
            if (sortingselect) {
                // OR sorting (match if any artist matches)
                artistMatch = selectedFilters.artists.length === 0 || selectedFilters.artists.some(selectedArtist => 
                    item.track.artists.some(artist => artist.name === selectedArtist)
                );
            } else {
                // AND sorting (match if all artists must match)
                artistMatch = selectedFilters.artists.length === 0 || selectedFilters.artists.every(selectedArtist => 
                    item.track.artists.some(artist => artist.name === selectedArtist)
                );
            }

            let genreMatch;
            if (sortingselectA) {
                // OR sorting (match if any artist matches)
                genreMatch = selectedFilters.genres.length === 0 || selectedFilters.genres.some(selectedGenre => item.track.artists.some(artist => (artistGenres[artist.id] || []).includes(selectedGenre)));
            } else {
                // AND sorting (match if all artists must match)
                genreMatch = selectedFilters.genres.length === 0 || selectedFilters.genres.every(selectedGenre => item.track.artists.some(artist => (artistGenres[artist.id] || []).includes(selectedGenre)));
            }
            //const artistMatch = selectedFilters.artists.length === 0 || selectedFilters.artists.some(selectedArtist => item.track.artists.some(artist => artist.name === selectedArtist));
            //console.log(artistMatch, "match new")

            // const genreMatch = selectedFilters.genres.length === 0 || selectedFilters.genres.every(selectedGenre => item.track.artists.some(artist => (artistGenres[artist.id] || []).includes(selectedGenre)));
    
            return trackNameMatch && artistMatch && genreMatch;
        }).map(item => item.track.uri);
    
        displayTracks(allTracks.filter(item => filteredTracksUris.includes(item.track.uri)));
        
        
        // Show the save button if there are filtered tracks
        if (selectedFilters.artists.length > 0 || selectedFilters.genres.length > 0){
            savePlaylistBtn.classList.remove('hidden');
            selectSort.classList.remove('hidden');
            selectSortA.classList.remove('hidden');
            afficheListe.classList.remove('hidden')
            //console.log("hhh");
            //console.log(filteredTracksUris,selectedFilters);

        } else {
            savePlaylistBtn.classList.add('hidden');
            afficheListe.classList.add('hidden');
            //console.log("ouin");
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
        const newPlaylistName = `${currentPlaylistName} (Filtered by ${formatText(selectedFilters)})`;
        fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newPlaylistName,
                description: `Filtered playlist of ${currentPlaylistName} by ${formatText(selectedFilters)}. Made by SpotiTools!`,
                public: false
            })
        })
            .then(response => response.json())
            .then(data => {
                const newPlaylistId = data.id;
                addTracksToPlaylist(newPlaylistId);
                filterInput.value = '';	
                document.getElementById('genres-table').classList.add('hidden');
                document.getElementById('artists-table').classList.add('hidden');
                document.getElementById('save-playlist-btn').classList.add('hidden');
                document.getElementById('tracks-container').classList.add('hidden');
                document.getElementById('clear-filter-btn').classList.add('hidden');
                // Clear selected variables
                texto = '';
                selectedFilters = { artists: [], genres: [] };
            })
            .catch(error => console.error('Error creating new playlist:', error));

    }
    function formatText(data) {
        // Destructure the input data
        const { artists, genres } = data;
    
        // Create a string for the genres
        const genreText = genres.length > 1
            ? genres.slice(0, -1).join(', ') + ' and ' + genres.slice(-1)
            : genres[0];
    
        // Create a string for the artists
        const artistText = artists.length > 1
            ? artists.slice(0, -1).join(', ') + ' and ' + artists.slice(-1)
            : artists[0];
    
        // Construct the final text
        return `${genreText} songs made by ${artistText} only`;
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

window.addEventListener('scroll', function() {
    var navbar = document.querySelector('.navbar');
    if (window.scrollY > 30) { // Adjust the scroll threshold as needed
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navRight = document.querySelector('.nav-right');
    const navBtn1 = document.querySelector('#btn1');
    const navBtn2 = document.querySelector('#btn2');
    const navBtn3 = document.querySelector('#btn3');
    const navBtn4 = document.querySelector('#btn4');
    const navBtn5 = document.querySelector('#btn5');
    const navBar = document.querySelector('.navbar');
    
    hamburger.addEventListener('click', function() {
        navRight.classList.toggle('expr');
        navBtn1.classList.toggle('expb');
        navBtn1.classList.toggle('nav-btn');
        navBtn2.classList.toggle('expb');
        navBtn2.classList.toggle('nav-btn');
        navBtn3.classList.toggle('expb');
        navBtn3.classList.toggle('nav-btn');
        navBtn4.classList.toggle('expb');
        navBtn4.classList.toggle('nav-btn');
        navBtn5.classList.toggle('expb');
        navBtn5.classList.toggle('nav-btn');
        navBar.classList.toggle('expbar');

    });
});

document.addEventListener('DOMContentLoaded', function() {
    function checkWidthAndUpdateButton() {
        const btn1 = document.getElementById('btn1');
        const btn2 = document.getElementById('btn2');
        const btn3 = document.getElementById('btn3');
        const btn4 = document.getElementById('btn4');
        const btn5 = document.getElementById('btn5');
        const geno =  document.getElementById('naviga');
        const rrr =  document.getElementById('navir');
        if (window.innerWidth > 800) {
            btn1.classList.add('nav-btn'); // Replace 'your-class-name' with the class you want to add
            btn2.classList.add('nav-btn');
            btn3.classList.add('nav-btn');
            btn4.classList.add('nav-btn');
            btn5.classList.add('nav-btn');
            geno.classList.remove('expbar')
            rrr.classList.remove('expr')
        }
    }
    var checkInterval = setInterval(function() {
        const rrr =  document.getElementById('navir');
        if ((window.innerWidth < 800) && (rrr.classList.contains('expr')) && !(rrr.classList.contains('expb')) ){
            btn1.classList.add('expb'); // Replace 'your-class-name' with the class you want to add
            btn2.classList.add('expb');
            btn3.classList.add('expb');
            btn4.classList.add('expb');
            btn5.classList.add('expb');
        }
    },100);


    // Run on initial load
    checkWidthAndUpdateButton();

    // Add event listener for window resizing
    window.addEventListener('resize', checkWidthAndUpdateButton);
});




document.addEventListener('DOMContentLoaded', async function () {

    let valeur = 0;
    const stringurl = 'https://spotitools.onrender.com';
    document.getElementById('select-filters-btn').classList.add('hidden');
    await fetchClientId();
      // Replace with your Spotify Client ID
    const redirectUri = `${stringurl}callback`;
    const scopes = 'playlist-read-private playlist-modify-public playlist-modify-private';
    const loginBtn = document.getElementById('login-btn');
    let accessToken = '';
    let matchinessPercentage = 0
    let totalTracks = 0;
    let matchingTracks = 0;


    document.getElementById('adding').addEventListener('click', function (e) {
        e.preventDefault(); // Prevent form submission

        // Get the form and the current number of playlist inputs
        const form = document.querySelector('.form');
        const currentCount = form.querySelectorAll('.form-group').length;

        // Create a new form group
        const newFormGroup = document.createElement('div');
        newFormGroup.className = 'form-group';

        // Create the label
        const newLabel = document.createElement('label');
        newLabel.className = 'form-label';
        newLabel.setAttribute('for', `playlist-${currentCount + 1}`);
        newLabel.textContent = `Playlist ${currentCount + 1}`;

        // Create the input
        const newInput = document.createElement('input');
        newInput.className = 'form-input';
        newInput.type = 'text';
        newInput.id = `playlist-${currentCount + 1}`;
        newInput.name = `playlist-${currentCount + 1}`;
        newInput.required = true;

        // Append the label and input to the form group
        newFormGroup.appendChild(newLabel);
        newFormGroup.appendChild(newInput);

        // Append the new form group to the form before the submit button
        form.insertBefore(newFormGroup, document.getElementById('adding'));
        document.getElementById('removing').classList.remove('hidden');
        
    });
    document.getElementById('removing').addEventListener('click', function (e) {
        e.preventDefault(); // Prevent form submission

        const form = document.querySelector('.form');
        const formGroups = form.querySelectorAll('.form-group');
        const currentCount = formGroups.length;

        if (currentCount > 2) {
            // Remove the last form group, which is the last .form-group element
            form.removeChild(formGroups[currentCount - 1]);
        }

        // Hide the remove button if only two input fields remain
        if (currentCount - 1 <= 2) {
            document.getElementById('removing').classList.add('hidden');
        }
        });

        // Event listener for showing filter options
    document.getElementById('select-filters-btn').addEventListener('click', function () {
        const filterOptions = document.getElementById('filter-options');
        filterOptions.classList.toggle('hidden'); // Toggle visibility of filter options
    });

    // Event listener for the next button
    
    // Function to extract playlist IDs from input fields
    function getPlaylistIdsFromInputs() {
        const form = document.querySelector('.form');
        const inputs = form.querySelectorAll('.form-input');
        const playlistIds = [];

        inputs.forEach(input => {
            const url = input.value.trim();
            const playlistId = extractPlaylistIdFromUrl(url);
            if (playlistId) {
                playlistIds.push(playlistId);
            }
        });

        return playlistIds;
    }

    // Function to extract playlist ID from a Spotify URL
    function extractPlaylistIdFromUrl(url) {
        const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }


    // Example usage
    // Assuming `allTracks` is defined globally to accumulate tracks from all playlists
    // Assuming `allTracks` is defined globally to accumulate tracks from all playlists
    let allTracks = [];
    let userId = '';
    let playlistIds = [];
    let sharedTracks = [];
    let matchyTracksList = [];

    
    

    document.getElementById('next-btn').addEventListener('click', async function (e) {
        e.preventDefault();
        const selectedFilter = document.querySelector('input[name="filter"]:checked').value;
        //console.log(`Selected Filter: ${selectedFilter}`); // For demonstration, logs the selected filter
    
        const playlistIds = getPlaylistIdsFromInputs();
        allTracks = []; // Reset before fetching
    
        // Array of promises for fetching tracks
        const fetchPromises = playlistIds.map(playlistId => fetchAllTracks(accessToken, playlistId));
    
        // Wait for all promises to resolve
        await Promise.all(fetchPromises);
    
        //console.log("All fetched tracks:", allTracks);
    
        if (allTracks.length > 0) {
            saveFilteredPlaylist();
        } else {
            console.error("No tracks fetched.");
        }
    });
    
    function fetchAllTracks(accessToken, playlistId) {
        return new Promise((resolve, reject) => {
            const limit = 100;
            let offset = 0;
            
    
            function fetchTracks() {
                fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.items) {
                        throw new Error('No track items found in the response.');
                    }
    
                    let tracks = data.items.filter(item =>
                        item.track &&
                        item.track.artists &&
                        item.track.artists.length > 0
                    );
                    totalTracks += tracks.length;
                    
    
                    if (isRandomFilterSelected()) {
                        const halfLength = Math.floor(tracks.length / 2);
                        tracks = shuffleArray(tracks).slice(0, halfLength);
                    }
                    else if (isArtistsFilterSelected()) {
                        tracks.forEach(track => {
                            track.track.artists.forEach(artist => {
                                const artistId = artist.id;
                                if (!sharedArtistsTracks[artistId]) {
                                    sharedArtistsTracks[artistId] = [];
                                }
                                sharedArtistsTracks[artistId].push(track);
                            });
                        });
    
                        if (Object.keys(sharedArtistsTracks).length > 1) {
                            let commonArtists = Object.keys(sharedArtistsTracks).filter(artistId =>
                                sharedArtistsTracks[artistId].length > 1
                            );
    
                            let commonTracks = [];
                            commonArtists.forEach(artistId => {
                                commonTracks = commonTracks.concat(sharedArtistsTracks[artistId]);
                            });
    
                            tracks = commonTracks;
                        } else {
                            tracks = []; // No common artists found
                        }
                    }
                    else if (isGenresFilterSelected()) {
                        tracks.forEach(track => {
                            track.track.artists.forEach(artist => {
                                fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
                                    headers: {
                                        'Authorization': `Bearer ${accessToken}`
                                    }
                                })
                                    .then(response => response.json())
                                    .then(artistData => {
                                        const genres = artistData.genres;
                                        genres.forEach(genre => {
                                            if (!sharedGenresTracks[genre]) {
                                                sharedGenresTracks[genre] = [];
                                            }
                                            sharedGenresTracks[genre].push(track);
                                        });
    
                                        if (Object.keys(sharedGenresTracks).length > 1) {
                                            let commonGenres = Object.keys(sharedGenresTracks).filter(genre =>
                                                sharedGenresTracks[genre].length > 1
                                            );
    
                                            let commonTracks = [];
                                            commonGenres.forEach(genre => {
                                                commonTracks = commonTracks.concat(sharedGenresTracks[genre]);
                                            });
    
                                            tracks = commonTracks;
                                        } else {
                                            tracks = []; // No common genres found
                                        }
                                    })
                                    .catch(error => console.error('Error fetching artist genres:', error));
                            });
                        });
                    }
                    else if (isMatchyFilterSelected()) {
                        const allArtists = {};
                        const allGenres = {};
    
                        // First, gather artists and genres
                        const genrePromises = tracks.map(item => {
                            const artists = item.track.artists;
                            artists.forEach(artist => {
                                if (!allArtists[artist.id]) {
                                    allArtists[artist.id] = [];
                                }
                                allArtists[artist.id].push(item.track);
                            });
    
                            return Promise.all(
                                artists.map(artist =>
                                    fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
                                        headers: {
                                            'Authorization': `Bearer ${accessToken}`
                                        }
                                    })
                                        .then(response => response.json())
                                        .then(artistData => {
                                            const genres = artistData.genres;
                                            genres.forEach(genre => {
                                                if (!allGenres[genre]) {
                                                    allGenres[genre] = [];
                                                }
                                                allGenres[genre].push(item.track);
                                            });
                                        })
                                        .catch(error => console.error('Error fetching artist genres:', error))
                                )
                            );
                        });
    
                        // After fetching all genres, process the shared tracks
                        Promise.all(genrePromises).then(() => {
                            Object.keys(allArtists).forEach(artistId => {
                                if (allArtists[artistId].length > 1) {
                                    matchyTracksList.push(...allArtists[artistId]); // Adding duplicates if they exist
                                }
                            });

                            Object.keys(allGenres).forEach(genre => {
                                if (allGenres[genre].length > 1) {
                                    matchyTracksList.push(...allGenres[genre]); // Adding duplicates if they exist
                                }
                            });

                            //console.log("Tracks for Matchy Filter: ", matchyTracksList);
                        });
                    }
    
                    // Use spread operator to add new tracks
                    allTracks.push(...tracks);
                    sharedTracks.push(tracks);
    
                    if (data.next) {
                        offset += limit;
                        fetchTracks();
                    } else {
                        //(`Fetched tracks for playlist ${playlistId}:`, allTracks);
                        //console.log("yiii", sharedTracks)
                        
                        resolve();  // Resolve the promise when fetching for this playlist is done
                    }
                })
                .catch(error => {
                    console.error('Error fetching tracks:', error);
                    reject(error);  // Reject the promise if there's an error
                });
            }
    
            fetchTracks();
        });
    }
    
    

    loginBtn.addEventListener('click', function () {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        const authWindow = window.open(authUrl, 'SpotifyAuth', 'width=600,height=400');

        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin) {
                return;
            }
            accessToken = event.data.access_token;
            if (accessToken) {
                authWindow.close();
                fetchUserId(accessToken);
                loginBtn.classList.add("hidden")
                document.getElementById('select-filters-btn').classList.remove('hidden');
            }
        }, false);
    });


    
    

    // Helper function to check if "Random" filter is selected
    function isRandomFilterSelected() {
        // Replace with your actual logic to check if the Random filter is selected
        const filterElement = document.getElementById('random'); // Example filter element
        return filterElement && filterElement.value === 'Random';
    }
    function isArtistsFilterSelected() {
        // Replace with your actual logic to check if the Random filter is selected
        const filterElement = document.getElementById('artists'); // Example filter element
        return filterElement && filterElement.value === 'Artists';
    }
    function isGenresFilterSelected() {
        // Replace with your actual logic to check if the Random filter is selected
        const filterElement = document.getElementById('genres'); // Example filter element
        return filterElement && filterElement.value === 'Genres';
    }
    function isMatchyFilterSelected() {
        // Replace with your actual logic to check if the Random filter is selected
        const filterElement = document.getElementById('matchy'); // Example filter element
        return filterElement && filterElement.value === 'Matchy';
    }

    // Helper function to shuffle an array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    let filteredTracksUris = [];

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
    async function getPlaylistTrackCount(accessToken, playlistId) {
        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            const trackCount = data.total; // The 'total' property gives the total number of tracks in the playlist
    
            return trackCount;
        } catch (error) {
            console.error('Error fetching playlist track count:', error);
            return 0; // Return 0 if there's an error
        }
    }
    
    
    function saveFilteredPlaylist() {
        const selectedFilter = document.querySelector('input[name="filter"]:checked').value;
        //console.log(selectedFilter)
        const newPlaylistName = `Mixed UP! by SpotiTools (${selectedFilter})`;
        const descr = `This playlist was made using SpotiTools with the ${selectedFilter} filter`
        fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newPlaylistName,
                description: descr,
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
        const trackUris = allTracks.map(item => item.track.uri);
    
        if (trackUris.length === 0) {
            console.error("No track URIs found.");
            return;
        }
    
        //console.log("Track URIs to add:", trackUris);
    
        const trackUrisChunked = [];
        for (let i = 0; i < trackUris.length; i += 100) {
            trackUrisChunked.push(trackUris.slice(i, i + 100));
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
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to add tracks');
                }
                return response.json();
            })
            .then(() => addTracks(chunkIndex + 1))
            .catch(error => console.error('Error adding tracks to playlist:', error));
        }
    
        addTracks(0);
        const matchinessPercentageElement = document.createElement('div');
        matchinessPercentageElement.id = 'matchiness-percentage';
        matchinessPercentageElement.style.fontSize = '18px';
        matchinessPercentageElement.style.fontWeight = 'bold';
        matchinessPercentageElement.style.marginTop = '20px';
        //console.log(allTracks.length, totalTracks)
        const matchinessPercentage = (allTracks.length / totalTracks) * 100;
        //matchinessPercentageElement.innerText = `Matchiness: ${matchinessPercentage.toFixed(2)}%`;
        //document.getElementById("changement").appendChild(matchinessPercentageElement);

        if (!document.getElementById('refresh-btn')) {
            const refreshbtn = document.createElement('button');
            refreshbtn.innerText = 'Refresh Page';
            refreshbtn.id = 'refresh-btn';
            refreshbtn.addEventListener('click', function () {
                window.location.href=window.location.href
            });
            document.getElementById("changement").appendChild(refreshbtn);
        }

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
        document.getElementById("boxie").classList.add("hidden");
        

    }
    
    

    

});

document.addEventListener('DOMContentLoaded',async function (){
      // Replace with your Spotify Client ID
    await fetchClientId();
    const redirectUri = `${stringurl}callback`;
    const scopes = 'user-read-email user-read-private user-top-read playlist-read-private';
    const loginBtn = document.getElementById('login-btnn');
    let accessToken = '';
    loginBtn.addEventListener('click', function () {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        const authWindow = window.open(authUrl, 'SpotifyAuth', 'width=600,height=400');

        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin) {
                return;
            }
            accessToken = event.data.access_token;
            if (accessToken) {
                authWindow.close();
                
                loginBtn.classList.add("hidden");
                getThings(accessToken);
                
            }
        }, false);
    });
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getThings(accessToken){
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };

        fetch('https://api.spotify.com/v1/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }
          return response.json();
        })
        .then(data => {
           // console.log(data);  // Handle the response data here
          // Select the div to display user info
            const userInfoDiv = document.getElementById('userInfo');
            const profileImageUrl = data.images && data.images.length > 0 ? data.images[1].url : 'default-image-url.jpg';
            const txto = data.product;
            txti = capitalizeFirstLetter(txto);
            
            
            // Display user info in the HTML
            userInfoDiv.innerHTML = `
                <div id="adapter" style="display: flex; align-items: center;">
                    <div id="logito" style="margin-right: 20px;">
                    <img src="${profileImageUrl}" alt="Profile Picture" width="150" style="border-radius: 5px;" />
                    </div>
                    <div>
                    <p><strong>Name:</strong> ${data.display_name}</p>
                    <p><strong>Username:</strong> ${data.id}</p>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Country:</strong> ${data.country}</p>
                    <p><strong>Spotify URL:</strong> <a href="${data.external_urls.spotify}" target="_blank">Profile</a></p>
                    <p><strong>Account Type :</strong> ${txti}</p>
                    </div>
                </div>
                <h1 class="titredesbails">STATS :</h1>
                <div id="statos"></div>
                
            `;
            const trackInfoDiv = document.getElementById('statos');
            
            // Fetch the user's most listened artists
            fetch('https://api.spotify.com/v1/me/top/artists?limit=3', {
                method: 'GET',
                headers: headers
            })
            .then(response => response.json())
            .then(artistData => {
               // console.log('Most listened artist:', artistData.items);
                
                const artistInfo = document.createElement('div');
                const hamid = document.createElement('h3');
                const artistImageUrl0 = artistData.items[0].images && artistData.items[0].images.length > 0 
                    ? artistData.items[0].images[0].url 
                    : 'default-artist-image.jpg';

                const artistImageUrl1 = artistData.items[1].images && artistData.items[1].images.length > 0 
                    ? artistData.items[1].images[0].url 
                    : 'default-artist-image.jpg';

                const artistImageUrl2 = artistData.items[2].images && artistData.items[2].images.length > 0 
                    ? artistData.items[2].images[0].url 
                    : 'default-artist-image.jpg';

                hamid.innerHTML = `
                <strong>Most listened artists:</strong>`
                trackInfoDiv.appendChild(hamid);
                artistInfo.classList.add("helloi");
                artistInfo.innerHTML = `
                <div class="songo">
                    <a href="${artistData.items[0].external_urls.spotify}" target="_blank">
                        <img src="${artistImageUrl0}" alt="Artist Image" />
                    </a>
                    <p><a href="${artistData.items[0].external_urls.spotify}" target="_blank">${artistData.items[0].name}</a></p>
                </div>
                <div class="songo">
                    <a href="${artistData.items[1].external_urls.spotify}" target="_blank">
                        <img src="${artistImageUrl1}" alt="Artist Image" />
                    </a>
                    <p><a href="${artistData.items[1].external_urls.spotify}" target="_blank">${artistData.items[1].name}</a></p>
                </div>
                <div class="songo">
                    <a href="${artistData.items[2].external_urls.spotify}" target="_blank">
                        <img src="${artistImageUrl2}" alt="Artist Image" />
                    </a>
                    <p><a href="${artistData.items[2].external_urls.spotify}" target="_blank">${artistData.items[2].name}</a></p>
                </div>`;
                trackInfoDiv.appendChild(artistInfo);
            })
            .catch(error => {
                console.error('Error fetching top artists:', error);
            });
        
            // Fetch the user's most listened songs
            fetch('https://api.spotify.com/v1/me/top/tracks?limit=3', {
                method: 'GET',
                headers: headers
            })
            .then(response => response.json())
            .then(trackData => {
                //console.log('Most listened track:', trackData.items);
                const josh = document.createElement('h3');
                const trackInfo = document.createElement('div');
                trackInfo.classList.add("helloi");
                josh.innerHTML = `<strong>Most listened songs:</strong>`
                const albumCoverUrl0 = trackData.items[0].album.images && trackData.items[0].album.images.length > 0
                    ? trackData.items[0].album.images[1].url // Use the second image for medium size
                    : 'default-image-url.jpg'; // Fallback image if no album cover is available
                const albumCoverUrl1 = trackData.items[0].album.images && trackData.items[1].album.images.length > 0
                    ? trackData.items[1].album.images[1].url // Use the second image for medium size
                    : 'default-image-url.jpg'; // Fallback image if no album cover is available
                const albumCoverUrl2 = trackData.items[0].album.images && trackData.items[2].album.images.length > 0
                    ? trackData.items[2].album.images[1].url // Use the second image for medium size
                    : 'default-image-url.jpg'; // Fallback image if no album cover is available
                trackInfoDiv.appendChild(josh);
                
                trackInfo.innerHTML = `
                        <div class="songo">
                            <a href="${trackData.items[0].external_urls.spotify}" target="_blank">
                                <img src="${albumCoverUrl0}" alt="Album Cover" />
                            </a>
                            <p>${trackData.items[0].name} by <strong>${trackData.items[0].artists[0].name}</strong></p>
                        </div>
                        <div class="songo">
                            <a href="${trackData.items[1].external_urls.spotify}" target="_blank">
                                <img src="${albumCoverUrl1}" alt="Album Cover" />
                            </a>
                            <p>${trackData.items[1].name} by <strong>${trackData.items[1].artists[0].name}</strong></p>
                        </div>
                        <div class="songo">
                            <a href="${trackData.items[2].external_urls.spotify}" target="_blank">
                                <img src="${albumCoverUrl2}" alt="Album Cover" />
                            </a>
                            <p>${trackData.items[2].name} by <strong>${trackData.items[2].artists[0].name}</strong></p>
                        </div>

                `;
                trackInfoDiv.appendChild(trackInfo);
            })
            .catch(error => {
                console.error('Error fetching top tracks:', error);
            });
        
            // Fetch the user's playlists
            fetch('https://api.spotify.com/v1/me/playlists?limit=3', {
                method: 'GET',
                headers: headers
            })
            .then(response => response.json())
            .then(playlistData => {
               // console.log('Most recent playlist:', playlistData.items);
                const issa = document.createElement('h3');
                const playlistInfo = document.createElement('div');
                playlistInfo.classList.add("helloi");
                issa.innerHTML = `<strong>Most recent playlists:</strong>`
                const playlistCoverUrl0 = playlistData.items[0].images && playlistData.items[0].images.length > 0 
                    ? playlistData.items[0].images[0].url 
                    : 'default-playlist-cover.jpg';

                const playlistCoverUrl1 = playlistData.items[1].images && playlistData.items[1].images.length > 0 
                    ? playlistData.items[1].images[0].url 
                    : 'default-playlist-cover.jpg';

                const playlistCoverUrl2 = playlistData.items[2].images && playlistData.items[2].images.length > 0 
                    ? playlistData.items[2].images[0].url 
                    : 'default-playlist-cover.jpg';

                trackInfoDiv.appendChild(issa);
                playlistInfo.innerHTML = `
                    <div class="songo">
                        <a href="${playlistData.items[0].external_urls.spotify}" target="_blank">
                            <img src="${playlistCoverUrl0}" alt="Playlist Cover" />
                        </a>
                        <p><a href="${playlistData.items[0].external_urls.spotify}" target="_blank">${playlistData.items[0].name}</a></p>
                    </div>
                    <div class="songo">
                        <a href="${playlistData.items[1].external_urls.spotify}" target="_blank">
                            <img src="${playlistCoverUrl1}" alt="Playlist Cover" />
                        </a>
                        <p><a href="${playlistData.items[1].external_urls.spotify}" target="_blank">${playlistData.items[1].name}</a></p>
                    </div>
                    <div class="songo">
                        <a href="${playlistData.items[2].external_urls.spotify}" target="_blank">
                            <img src="${playlistCoverUrl2}" alt="Playlist Cover" />
                        </a>
                        <p><a href="${playlistData.items[2].external_urls.spotify}" target="_blank">${playlistData.items[2].name}</a></p>
                    </div>`;
                trackInfoDiv.appendChild(playlistInfo);
            })
            .catch(error => {
                console.error('Error fetching playlists:', error);
            });
            
        })
        .catch(error => {
          console.error('Error:', error);
        });
      }
}) 