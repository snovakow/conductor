# Greenscreen

**TypeScript + React + three.js + React Three Fiber + Vite + WebGL**

A live chroma key for a webcam, in the browser. It keys a colour out of the camera's picture with a port of OBS Studio's chroma key filter, and a panel tunes the key and the picture.

## Using it

The camera's own picture is in the corner, unkeyed. The two tools work on it, enlarged, while the big picture shows what they do.

**Pick key** takes the key from the camera's picture: press it, then click the colour to key out on the enlarged preview. It reads the camera's frame there, averaging a few pixels to smooth out the noise, so it can pick a colour the key has already taken out of the big picture. The preview stays enlarged, so you can click again until the big picture looks right. Pick key again, Done, or Escape puts it down.

**Crop** cuts the picture down to a shape, whatever its colour. Turned off, the whole picture shows again, and the shape is kept for when it's back on. **Edit crop** turns Crop on and puts a handle on each corner of the shape over the enlarged preview: drag them, and once the shape is smaller than the picture, drag inside it to move it whole. Done, Escape, or Edit crop again puts the handles down. While Crop is on, the preview shows the shape's outline.

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

The keying shader is a port of [OBS Studio](https://obsproject.com)'s [chroma key filter](https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter_v2.effect), with its settings in OBS's ranges. The tint (**Color**), **Saturation**, **Flip**, **Pick key** and **Crop** are this app's own.
