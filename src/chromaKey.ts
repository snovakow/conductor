import { Color, Vector2 } from 'three'
import type { Texture } from 'three'

// The keying shader: OBS Studio's chroma key filter (its second version), ported to GLSL, with OBS's names for what is
// OBS's. A tint and a saturation control are added. Like OBS, it measures each pixel's distance from the key in the
// video's sRGB values and does everything else in linear light
// https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter_v2.effect

export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main(void) {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

export const fragmentShader = /* glsl */ `
// From https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter_v2.effect

uniform sampler2D image;

const vec4 cb_v4 = vec4(-0.100644, -0.338572, 0.439216, 0.501961);
const vec4 cr_v4 = vec4(0.439216, -0.398942, -0.040274, 0.501961);

uniform float opacity;
uniform float contrast;
uniform float brightness;
uniform float gamma;

uniform vec2 chroma_key;
uniform vec2 pixel_size;
uniform float similarity;
uniform float smoothness;
uniform float spill;

// Not OBS's
uniform vec3 tint;
uniform float saturation;

varying vec2 vUv;

vec3 CalcColor(in vec3 rgb) {
	return pow(rgb, vec3(gamma, gamma, gamma)) * contrast + brightness;
}

float GetChromaDist(in vec3 rgb) {
	float cb = dot(rgb, cb_v4.xyz) + cb_v4.w;
	float cr = dot(rgb, cr_v4.xyz) + cr_v4.w;
	return distance(chroma_key, vec2(cb, cr));
}

// The video's sRGB values, which is how three.js uploads a video whatever its texture's colour space. OBS samples
// linear colour and encodes it here, so its samples between texels are blended in linear light, and these in sRGB
vec3 SampleTexture(in vec2 uv) {
	return texture2D(image, uv).rgb;
}

float GetBoxFilteredChromaDist(in vec3 rgb, in vec2 texCoord) {
	// OBS's V runs down the picture and three's runs up, so a pixel down is a step back in V
	vec2 pixel = vec2(pixel_size.x, -pixel_size.y);
	vec2 h_pixel = pixel / 2.0;
	vec2 point_0 = vec2(pixel.x, h_pixel.y);
	vec2 point_1 = vec2(h_pixel.x, -pixel.y);
	float distVal = GetChromaDist(SampleTexture(texCoord-point_0));
	distVal += GetChromaDist(SampleTexture(texCoord+point_0));
	distVal += GetChromaDist(SampleTexture(texCoord-point_1));
	distVal += GetChromaDist(SampleTexture(texCoord+point_1));
	distVal *= 2.0;
	distVal += GetChromaDist(rgb);
	return distVal / 9.0;
}

// From https://thebookofshaders.com/06/, with hsb2rgb the exact inverse of rgb2hsb
const vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
vec3 rgb2hsb(in vec3 c) {
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsb2rgb(in vec3 c) {
	vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
	return c.z * mix(vec3(1.0), rgb, c.y);
}
void changeSaturation(inout vec3 rgb, float change) {
	vec3 hsb = rgb2hsb(rgb);
	hsb.g = clamp(hsb.g * change, 0.0, 1.0);
	rgb = hsb2rgb(hsb);
}

void main(void) {
	vec3 srgb = SampleTexture(vUv);
	float chromaDist = GetBoxFilteredChromaDist(srgb, vUv);
	float baseMask = chromaDist - similarity;
	float fullMask = pow(clamp(baseMask / smoothness, 0.0, 1.0), 1.5);
	float spillVal = pow(clamp(baseMask / spill, 0.0, 1.0), 1.5);

	vec3 rgb = sRGBTransferEOTF(vec4(srgb, 1.0)).rgb;
	rgb *= tint;

	float a = opacity;
	a *= fullMask;

	float desat = dot(rgb, vec3(0.2126, 0.7152, 0.0722));

	if(saturation != 1.0) changeSaturation(rgb, saturation);

	rgb = mix(vec3(desat, desat, desat), rgb, spillVal);

	rgb = CalcColor(rgb);

	// Premultiplied, as OBS returns it, and clamped as the 8-bit target OBS draws to clamps it. Encoding the
	// premultiplied colour is OBS's linear blend only over opaque black: a see-through canvas would want the colour
	// encoded first and multiplied by a after
	gl_FragColor = vec4(clamp(rgb * a, 0.0, 1.0), a);
	#include <colorspace_fragment>
}
`

// OBS's preset keys. OBS writes colours as 0xbbggrr, so the 0xFF9900 it calls blue is this 0x0099ff
export const KEY_COLORS = { green: 0x00ff00, blue: 0x0099ff, magenta: 0xff00ff }

export type KeyType = keyof typeof KEY_COLORS | 'custom'

// What the panel edits: the filter's settings in OBS's units and ranges, and the app's own tint and saturation
export interface Settings {
  // The key is keyColor only when keyType is custom
  keyType: KeyType
  keyColor: number
  // 1 to 1000
  similarity: number
  smoothness: number
  spill: number
  // 0 to 1
  opacity: number
  // -4 to 4, -1 to 1 and -1 to 1, each 0 for no change
  contrast: number
  brightness: number
  gamma: number
  tint: number
  // 0 to 2, 1 for no change
  saturation: number
}

// OBS's defaults, with no tint
export const DEFAULT_SETTINGS: Settings = {
  keyType: 'green',
  keyColor: 0x00ff00,
  similarity: 400,
  smoothness: 80,
  spill: 100,
  opacity: 1,
  contrast: 0,
  brightness: 0,
  gamma: 0,
  tint: 0xffffff,
  saturation: 1,
}

// The chroma the shader keys around: a 0xrrggbb colour's Cb and Cr by the shader's cb_v4 and cr_v4, from its sRGB
// values, as OBS works it out
export function chromaOf(hex: number): [number, number] {
  const r = ((hex >> 16) & 0xff) / 255
  const g = ((hex >> 8) & 0xff) / 255
  const b = (hex & 0xff) / 255
  return [
    -0.100644 * r - 0.338572 * g + 0.439216 * b + 0.501961,
    0.439216 * r - 0.398942 * g - 0.040274 * b + 0.501961,
  ]
}

export function createUniforms() {
  const uniforms = {
    image: { value: null as Texture | null },
    pixel_size: { value: new Vector2(1, 1) },
    opacity: { value: 1 },
    contrast: { value: 1 },
    brightness: { value: 0 },
    gamma: { value: 1 },
    chroma_key: { value: new Vector2() },
    similarity: { value: 1 },
    smoothness: { value: 1 },
    spill: { value: 1 },
    tint: { value: new Color() },
    saturation: { value: 1 },
  }
  applySettings(uniforms, DEFAULT_SETTINGS)
  return uniforms
}

export type ChromaKeyUniforms = ReturnType<typeof createUniforms>

// Settings into the shader's uniforms, as OBS's chroma_key_update_v2 does it
// https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/chroma-key-filter.c
export function applySettings(uniforms: Omit<ChromaKeyUniforms, 'image' | 'pixel_size'>, settings: Settings) {
  const { contrast, gamma } = settings

  uniforms.opacity.value = settings.opacity
  // A multiplier from 1/5 to 5, and an exponent from 2 to 1/2
  uniforms.contrast.value = contrast < 0 ? 1 / (1 - contrast) : contrast + 1
  uniforms.brightness.value = settings.brightness
  uniforms.gamma.value = gamma < 0 ? 1 - gamma : 1 / (1 + gamma)

  const key = settings.keyType === 'custom' ? settings.keyColor : KEY_COLORS[settings.keyType]
  uniforms.chroma_key.value.set(...chromaOf(key))
  uniforms.similarity.value = settings.similarity / 1000
  uniforms.smoothness.value = settings.smoothness / 1000
  uniforms.spill.value = settings.spill / 1000

  // setHex makes the tint linear, as the colour it multiplies is
  uniforms.tint.value.setHex(settings.tint)
  uniforms.saturation.value = settings.saturation
}
