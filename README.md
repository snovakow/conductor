# Greenscreen

**TypeScript + React + three.js + React Three Fiber + Vite + WebGL**

A live chroma key for a webcam, in the browser. It keys a colour out of the camera's picture with a port of OBS Studio's chroma key filter, and a panel tunes the key and the picture.

## Running it locally

You need [Node.js](https://nodejs.org) 22.12 or later. Then, in a clone:

```sh
npm install
npm run dev
```

and open the address it prints. Browsers share a camera only with pages on `localhost` or HTTPS. **Load** asks for the camera again.

## Building it

`npm run build` type-checks the app and makes a static site in `dist/` that works from any folder on any web server. `npm run preview` serves that build locally, and `npm run lint` runs Oxlint.

## Credits

The keying shader is a port of [OBS Studio](https://obsproject.com)'s [chroma key filter](https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter.effect).
