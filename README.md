# Conductor

**TypeScript + React + Vite + WebGPU or WebGL2**

A live compositor in the browser. Cameras, screens, images and videos are prepared in the **Inspector** by its greenscreen: keyed, mirrored, cut to a shape and colour-corrected. The **Whiteboard** places them together, with lines drawn over them. Any one of them, or the whiteboard, goes to the **Output**, which pops out into a window of its own and records to a file.

## Using it

**Media Assets**, down the left, lists the sources, a kind at a time: **Video Sources** (every camera, opened at the start), **Files** and **Screens**. **File** loads images and videos, and dropping files anywhere on the page does too. **Screen** shares a screen, window or tab, which leaves the list when its sharing stops. **Camera** asks for the cameras again and opens any that aren't open. **×** removes a source from everywhere it's used.

### Inspector

A source clicked in Media Assets opens here: large, as it will be used, with its settings at the top right and its own picture in the corner. A source starts as it comes, unkeyed and uncut. Any change prepares it, from then on, wherever it's used, and **Reset** puts it back as it came.

**Key** keys out the key colour, which **Key color type** chooses, and **Similarity**, **Smoothness** and **Spill** tune. It keys as OBS Studio's chroma key filter does, with the filter's settings in OBS's units, so a key tuned in OBS can be copied across. **Opacity**, **Contrast**, **Brightness** and **Gamma** are the filter's too, so they act only while Key is on, and they're greyed out while it's off.

**Pick key** takes the key from the source's own picture and turns Key on: press it, then click the colour to key out on the enlarged picture in the corner. It reads the source's frame there, averaging a few pixels to smooth out a camera's noise, so it can pick a colour the key has already taken out of the big picture. The picture stays enlarged, so you can click again until the big picture looks right. A colour picked from a camera's screen is nearer grey than the presets are, so it usually needs a lower Similarity to keep the rest of the picture. Pick key again, Done, or Escape puts it down.

**Crop** cuts the picture down to a shape, whatever its colour. Turned off, the whole picture shows again, and the shape is kept for when it's back on. **Edit crop** turns Crop on and puts a handle on each corner of the shape over the enlarged picture: drag them, and once the shape is smaller than the picture, drag inside it to move it whole. Done, Escape, or Edit crop again puts the handles down. While Crop is on, the corner picture shows the shape's outline.

**Flip** mirrors the picture, and **Color**, **Opacity**, **Contrast**, **Brightness**, **Gamma** and **Saturation** change its colour. A prepared source is see-through where its key and its shape take the picture out, and an image's own transparency is kept.

### Whiteboard

A source clicked in Media Assets is placed on the board, fitted inside it, above the other sources and below the lines. Files loaded and screens shared while the Whiteboard is open are placed too.

On the board:

- **Drag** a source to move it.
- **Ctrl+drag** scales it about its centre: up to the right or upwards, down to the left or downwards.
- **Shift+click** places it the next of five ways: at its own size, fitted inside the board, filling it, or at half that size in either half of it.
- **Drag with the right button** to draw a line over everything.

**Layers**, down the right, lists what's on the board from the bottom up. Click a layer to bring it to the top, and Shift+click to take it off the board.

### Output

**Output**, at the top right, chooses what goes out: the whiteboard, or any one source as it's prepared. **Pop out** opens it in a window of its own, for a second screen or to capture with other software. **Record** there records it, and **Stop**, or closing the window, saves it as a WebM file. A recording keeps the size it started at, whatever is chosen during it.

The keying runs in this page, on WebGPU where the browser has it on the GPU and on WebGL2 elsewhere. While the pop-out covers the page, or it's in a background tab, the browser slows it to about 30 frames a second.

## Running it locally

You need [Node.js](https://nodejs.org) 22.12 or later. Then, in a clone:

```sh
npm install
npm run dev
```

and open the address it prints. Browsers share cameras and screens only with pages on `localhost` or HTTPS.

## Building it

`npm run build` type-checks the app and makes a static site in `dist/` that works from any folder on any web server. `npm run preview` serves that build locally, and `npm run lint` runs Oxlint.

## Credits

The greenscreen is [@snovakow/greenscreen](https://github.com/snovakow/greenscreen), an MIT-licensed chroma keyer. It keys as [OBS Studio](https://obsproject.com)'s chroma key filter does, and the credit for the keying is OBS's. **Pick key** and **Edit crop** are this app's own.
