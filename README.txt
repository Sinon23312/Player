YONETE — GitHub Pages static music player

1. Upload the contents of this folder to the ROOT of your GitHub repository.
2. Keep the folder named exactly "piese".
3. Upload MP3/M4A/AAC/OGG/WAV/FLAC files into piese/.
4. Enable GitHub Pages in Settings > Pages (Deploy from branch, main, /(root)).
5. The public GitHub Pages site discovers audio files in /piese automatically via GitHub Contents API.
6. Repository must be public for unauthenticated API listing. If you use a custom domain, set githubOwner and githubRepo in script.js.

No START.bat, Python, server, or folder picker is needed on GitHub Pages.
A browser cannot enumerate a local folder when index.html is opened via file://, but hosted GitHub Pages works.
