# STEVEN ZHANG | Cinematic Archive & Portfolio

A bespoke, highly aesthetic personal archive and creative portfolio designed with a modern dark-gold palette, smooth transitions, and cryptographic protection. 

## Features

### 🎬 The Hub (`index.html`)
The gateway of the archive, featuring custom category sliders, dynamic transitions, and quick entry ports to all sub-archives.

### 📷 The Voyage Archive (`voyage.html`)
A visual photography journal capturing moments, landscapes, and stories across regions and eras. Features include:
- **Cinematic Detail view**: Slide-to-immerse viewer with drag-to-pan high-res photos and responsive masonry galleries.
- **View Modes**: Switch dynamically between a responsive **Grid View** and an interactive **Map View** showing travel paths and coordinates.

### ✍️ Daily Fragments (`diary.html`)
A collection of personal diaries and reflections organized by categories. Features hover-responsive styling, tags, and detail view modals.

### 💡 Thought Fragments (`journal.html`)
A minimalist stream of consciousness containing ideas, quotes, and research notes.

### 🔐 The Vault (`vault.html`)
A cryptographically secure private room protected by **WebCrypto API (AES-GCM)**. 
- Fully client-side decryption using custom passcodes.
- Automated session wiping to prevent leakage of private entries.

### ✉️ Standalone Sharing (`share.html`)
A premium landing page for shared archive entries.
- Responsive, bilingual layouts (English and Chinese).
- Custom client-side dynamic QR code generation pointing back to the specific entry coordinates.
- Fully local library hosting (`qrcode.min.js`, `html2canvas.min.js`) for reliable load performance.

## Technology Stack

- **Core**: Vanilla HTML5, CSS3, ES6+ Javascript
- **Dependencies**: 
  - `qrcode.js` (Local copy for sharing coordinates)
  - `html2canvas` (Local copy for rendering high-res posters)
- **Deployment**: Static site hosted via GitHub Pages (deployed at `stevenzhangym.com`)

## Performance and Usability Optimizations
- **FOUT Prevention**: Integrated CSS `opacity` states synced with JavaScript `fonts.ready` checks to ensure typography loads without visual flash.
- **Local Asset Hosting**: Eliminated dependency on external script CDNs to prevent blocking issues in restricted networks.
- **Responsive Layouts**: Full viewport scaling and mobile-first gesture support for photography immersive viewers.
