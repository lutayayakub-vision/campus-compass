# Campus Compass

Build a working prototype of a web app for Makerere University called

"Fresher Finder" (or similar) that helps class representatives locate

freshers who are lost on campus and can't find their lecture buildings.

Core users:

- Class Rep: sees a live map of freshers in their class who've shared

  their location, can message any fresher 1-on-1, can mark a fresher

  as "found"/"guided"

- Fresher: on first login, picks their class/course; can tap "I'm lost"

  to share their live location, sees a chat with their class rep, and

  sees the target lecture building they're trying to reach

Must-have features:

1. Role-based login (Class Rep vs Fresher) — simple auth is fine for

   a prototype, doesn't need to be production-grade

2. A live map showing: the fresher's current location, the class rep's

   location (optional), and pins for major Makerere lecture buildings

   (e.g. CIT Block, Main Building, CEDAT, Frank Kalimuzo Building —

   pick a realistic sample set of coordinates)

3. A "share my location" flow for freshers, and a live-updating map

   view for reps showing all freshers who've shared location

4. 1-on-1 real-time chat between a rep and each individual fresher

   (not a group chat) so a rep can say "I'm 2 minutes away" etc.

5. A simple way for a fresher to select which building they're trying

   to reach, so the rep can see "this fresher wants X building"

Constraints:

- Use a free/open map (e.g. Leaflet + OpenStreetMap) rather than a

  paid API, since this needs to run without billing setup

- Should work well on a phone browser, since freshers will mostly be

  using mobile data on campus

- Prioritize the location-sharing + map + chat flow working end-to-end

  over polish elsewhere

Pick a sensible stack, write runnable code, and tell me how to run it

and what I'd need to add to take it from prototype to something I

could actually pilot with one class.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/11217e95-676e-45a6-906f-800c155682bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
