# Petcom

**Your dog’s sitcom. A new episode every day.**

Petcom turns your dog (and optionally you) into animated characters and generates daily 5-minute sitcom episodes inspired by Modern Family, Friends, Parks and Rec, Brooklyn Nine-Nine, and The Office—all centered on your dog’s adventures.

---

## Project structure

```
petcom/
├── README.md           # This file
├── DESIGN.md           # Full product design (concept, features, tech, comedy system)
├── package.json        # npm scripts for dev server
├── server.js           # Local dev server (port 2000)
└── prototype/
    └── index.html      # Interactive UI prototype
```

---

## Run the dev server (localhost:2000)

**Important:** Run these commands from inside the **petcom** folder, not from your home directory.

1. **Open the project in Cursor:** File → Open Folder → choose `petcom`. The terminal will then start in the right place.
2. **Or** in any terminal, go to the project first, then start the server:

   ```bash
   cd "/Users/tiffanyhuang/Documents/Coding Projects/petcom"
   npm run dev
   ```

3. Open **http://localhost:2000/** in your browser.

---

## Quick start (design & prototype)

1. **Read the design**  
   Open `DESIGN.md` for the full product spec: user journey, features, comedy system, technical considerations, and monetization.

2. **Try the prototype**  
   Open http://localhost:2000/ (after running `npm run dev` from the petcom folder), or open `prototype/index.html` directly in a browser. Click through:
   - **Landing** → Get started / See sample episodes  
   - **Upload** → Add photos for dog and optional owner (click cards to simulate)  
   - **Character preview** → Pick style (2D, 3D, Mockumentary)  
   - **Episode feed** → Sample episodes; click one to **Watch**

Use the bottom nav to jump between Episodes, Cast, and Home.

---

## Next steps

- Implement backend (auth, uploads, job queue for episode generation).
- Wire up real photo/video upload and character-generation pipeline.
- Add video player and episode API for the feed and watch screen.
