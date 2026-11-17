import { Vector2, Vector3 } from 'three'
import type { Texture } from 'three'

// The keying shader: OBS Studio's chroma key filter, ported to GLSL with a saturation control added. Like OBS, it works
// on the video's sRGB values as they come, so the colours that feed it go in unconverted too
// https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter.effect

export const vertexShader = /* glsl */ `
varying vec2 vTextureCoord;
void main(void) {
	vTextureCoord = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

export const fragmentShader = /* glsl */ `
// From https://github.com/obsproject/obs-studio/blob/master/plugins/obs-filters/data/chroma_key_filter.effect

uniform sampler2D uSampler;

uniform float u_saturation;

uniform vec3 color;
uniform float contrast;
uniform float brightness;
uniform float gamma;

uniform vec2 chromakey;
uniform vec2 pixelSize;
uniform float u_similarity;
uniform float u_smoothness;
uniform float u_spill;

varying vec2 vTextureCoord;

const mat4 yuv_mat = mat4(
	0.182586, 0.614231, 0.062007, 0.062745,
	-0.100644, -0.338572, 0.439216, 0.501961,
	0.439216, -0.398942, -0.040274, 0.501961,
	0.000000, 0.000000, 0.000000, 1.000000
);

vec3 CalcColor(inout vec3 rgb) {
	return pow(rgb, vec3(gamma, gamma, gamma)) * contrast + brightness;
}

float GetChromaDist(in vec3 rgb) {
	vec4 yuvx = vec4(rgb, 1.0) * yuv_mat;
	return distance(chromakey, yuvx.yz);
}

// From https://thebookofshaders.com/06/
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
	rgb = rgb*rgb*(3.0-2.0*rgb);
	return c.z * mix(vec3(1.0), rgb, c.y);
}
void changeSaturation(inout vec3 rgb, float change) {
	vec3 hsb = rgb2hsb(rgb);
	hsb.g *= change;
	rgb = hsb2rgb(hsb);
}

float GetBoxFilteredChromaDist(in vec3 rgb, in vec2 texCoord) {
	vec2 h_pixel_size = pixelSize / 2.0;
	vec2 point_0 = vec2(pixelSize.x, h_pixel_size.y);
	vec2 point_1 = vec2(h_pixel_size.x, -pixelSize.y);

	float distVal = GetChromaDist(texture2D(uSampler, texCoord-point_0).rgb);
	distVal += GetChromaDist(texture2D(uSampler, texCoord+point_0).rgb);
	distVal += GetChromaDist(texture2D(uSampler, texCoord-point_1).rgb);
	distVal += GetChromaDist(texture2D(uSampler, texCoord+point_1).rgb);
	distVal *= 2.0;
	distVal += GetChromaDist(rgb);
	return distVal / 9.0;
}

void main(void) {
	float a = 1.0;

	vec3 rgb = texture2D(uSampler, vTextureCoord).rgb;
	float chromaDist = GetBoxFilteredChromaDist(rgb, vTextureCoord);

	float baseMask = chromaDist - u_similarity;
	a *= pow(clamp(baseMask / u_smoothness, 0.0, 1.0), 1.5);
	if(a < 0.01) discard;

	rgb *= color.rgb;

	float desat = clamp(rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722, 0.0, 1.0);

	if(u_saturation != 1.0) changeSaturation(rgb, u_saturation);

	float spillVal = pow(clamp(baseMask / u_spill, 0.0, 1.0), 1.5);
	rgb = mix(vec3(desat, desat, desat), rgb, spillVal);

	gl_FragColor = vec4(CalcColor(rgb), a);
}
`

// The colours the panel starts at: no tint, and pure green as the key
export const DEFAULT_COLOR = 0xffffff
export const DEFAULT_KEY = 0x00ff00

// A 0xrrggbb colour's red, green and blue, from 0 to 1
export function channelsOf(hex: number): [number, number, number] {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255]
}

// The chroma the shader keys around: a colour's U and V by the shader's yuv_mat, worked out as OBS does
export function chromaOf(hex: number): [number, number] {
  const [r, g, b] = channelsOf(hex)
  return [
    -0.100644 * r - 0.338572 * g + 0.439216 * b + 0.501961,
    0.439216 * r - 0.398942 * g - 0.040274 * b + 0.501961,
  ]
}

export function createUniforms() {
  return {
    uSampler: { value: null as Texture | null },
    pixelSize: { value: new Vector2(1, 1) },
    color: { value: new Vector3(...channelsOf(DEFAULT_COLOR)) },
    contrast: { value: 1 },
    brightness: { value: 0 },
    gamma: { value: 1 },
    chromakey: { value: new Vector2(...chromaOf(DEFAULT_KEY)) },
    u_similarity: { value: 0.4 },
    u_smoothness: { value: 0.08 },
    u_spill: { value: 0.1 },
    u_saturation: { value: 1 },
  }
}

export type ChromaKeyUniforms = ReturnType<typeof createUniforms>
