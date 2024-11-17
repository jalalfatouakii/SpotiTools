import re
import time
import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
from spotipy.exceptions import SpotifyException

CLIENT_ID = " add your client id"
CLIENT_SECRET = "add your client secret"
SCOPE = 'playlist-read-private playlist-modify-public'
REDIRECT_URI = 'http://localhost:5001/callback'

# Authenticate
client_credentials_manager = SpotifyClientCredentials(
    client_id=CLIENT_ID, client_secret=CLIENT_SECRET
)
# Authenticate using OAuth
sp_oauth = SpotifyOAuth(client_id=CLIENT_ID,
                        client_secret=CLIENT_SECRET,
                        redirect_uri=REDIRECT_URI,
                        scope=SCOPE)
token_info = sp_oauth.get_cached_token()
if not token_info:
    auth_url = sp_oauth.get_authorize_url()
    print(f"Please navigate to the following URL to authenticate: {auth_url}")
    response = input("Enter the URL you were redirected to: ")
    code = sp_oauth.parse_response_code(response)
    token_info = sp_oauth.get_access_token(code)

access_token = token_info['access_token']
session = spotipy.Spotify(auth=access_token)

current_user = session.current_user()
USERNAME = current_user['id']

# Print user's playlists
playlists = session.current_user_playlists(limit=50)
print("Current user's playlists:")
i = 0
for playlist in playlists['items']:
    i += 1
    print(str(i)+") " + f"{playlist['name']} - {playlist['external_urls']['spotify']}")
print(str(i +1)+") Custom playlist link ")
print("Select the playlist you want to filter (number linked to it) : ")
index = input("Playlist number : ")
if int(index) == (i + 1):
    PLAYLIST_LINK = input("Enter a playlist link : ")
    popo = session.user_playlist(user=None, playlist_id=PLAYLIST_LINK[34:], fields="name")
    name_p = popo["name"]
else :
    PLAYLIST_LINK = playlists['items'][int(index)-1]['external_urls']['spotify']
    name_p = playlists['items'][int(index)-1]['name']

# Create Spotify session object
session = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

# Get URI from HTTPS link
match = re.match(r"https://open.spotify.com/playlist/([a-zA-Z0-9]+)", PLAYLIST_LINK)
if match:
    playlist_uri = match.groups()[0]
else:
    raise ValueError("Expected format: https://open.spotify.com/playlist/...")


# Initialize variables for pagination
offset = 0
limit = 100
tracks = []
total_tracks = session.playlist(playlist_uri)['tracks']['total']

# Function to handle retries with exponential backoff
def retry_with_backoff(func, max_retries=3):
    retries = 0
    while retries < max_retries:
        try:
            return func()
        except SpotifyException as e:
            print(f"Error fetching data: {e}")
            retries += 1
            wait_time = 2 ** retries  # Exponential backoff
            print(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
    raise Exception("Max retries exceeded. Failed to fetch data.")

# Fetch all tracks from the playlist
while offset < total_tracks:
    try:
        response = retry_with_backoff(lambda: session.playlist_tracks(playlist_uri, offset=offset, limit=limit))
        tracks.extend(response['items'])
        offset += limit
    except Exception as e:
        print(f"Failed to fetch tracks: {e}")
        break

print("Please select from the following : ")
print("1) Filter by artist")
print("2) Filter by genre")
selected = int(input("Select : "))
clear = []
liste = []
pourcent = 0
valeur = len(tracks)

if selected == 1:
    chosen = input("What artist do you want to keep? ")
elif selected == 2:
    chosen = input("Which genre do you want to keep? ")
    
# Create a new empty playlist
playlist_name = name_p  + " filtered by " + chosen + " only"
playlist_description = "This is a playlist containing only " + chosen + " songs from the playlist \"" + name_p +"\""

try:
    new_playlist = session.user_playlist_create(user=USERNAME,
                                                name=playlist_name,
                                                public=True,
                                                collaborative=False,
                                                description=playlist_description)
    print(f"'{playlist_name}' created successfully!")
    print(f"Playlist URL: {new_playlist['external_urls']['spotify']}")
    playlist_id = new_playlist['id']
except Exception as e:
    print(f"An error occurred while creating the playlist: {e}")
    
for track in tracks:
        if track['track'] and track['track']['type'] == 'track':  # Ensure the track is not None
            name = track["track"]["name"]
            artists = ", ".join(
                [artist["name"] for artist in track["track"]["artists"]]
            )
            
            # Fetch additional details (genre)
            try:
                artist_ids = [artist["id"] for artist in track["track"]["artists"]]
                genres = set()
                for artist_id in artist_ids:
                    retry_with_backoff(lambda: genres.update(session.artist(artist_id)["genres"]))
                genres = ", ".join(genres)
            except Exception as e:
                genres = "Unknown"  # Default to "Unknown" if genre fetching fails
                print(f"Failed to fetch genres for track '{name}': {e}")
            
            cond = False
            if selected == 1 :
                if chosen.lower() in artists.lower():
                    cond = True
                    
            elif selected == 2 :
                if chosen.lower() in genres.lower():
                    cond = True
            if cond :
                try:
                    # Search for the track
                    results = session.search(q=f"track:{name} artist:{artists}", type='track', limit=1)
                    if results['tracks']['items']:
                        track_uri = results['tracks']['items'][0]['uri']
                        # Add the track to the playlist
                        session.user_playlist_add_tracks(user=USERNAME, playlist_id=playlist_id, tracks=[track_uri])
                        print(f"Added '{name}' by {artists} to the playlist '{playlist_name}'.")
                    else:
                        print(f"Track '{name}' by {artists} not found.")
                except Exception as e:
                    print(f"An error occurred while adding the track '{name}' by {artists}: {e}")
            pourcent += 1
            print(str(round((pourcent/valeur)*100,2))  + "% Completed")
            

