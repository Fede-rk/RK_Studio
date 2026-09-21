// src/engine/glRenderer.js
import vertSrc    from '../shaders/vert.glsl?raw';
import blurSrc    from '../shaders/frag_blur.glsl?raw';
import effectsSrc from '../shaders/frag_effects.glsl?raw';

const MAX_DIM = 4096;

/* ---------- GL helpers ---------- */
function stripBOM(s) { return (s && s.charCodeAt(0) === 0xFEFF) ? s.slice(1) : s; }

function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, stripBOM(src));
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('Shader error:\n' + log);
    }
    return sh;
}

function createProgram(gl, vSrc, fSrc) {
    const v = compileShader(gl, gl.VERTEX_SHADER, vSrc);
    const f = compileShader(gl, gl.FRAGMENT_SHADER, fSrc);
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error('Program error:\n' + gl.getProgramInfoLog(p));
    return p;
}

function makeFBO(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { fbo, tex };
}

function destroyFBO(gl, obj) {
    if (!obj) return;
    gl.deleteTexture(obj.tex);
    gl.deleteFramebuffer(obj.fbo);
}

/* ---------- Renderer class ---------- */
export class GLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this._params = {};
        this._showOrig = false;
        this._hasImage = false;
        this._needsBlur = true;
        this._renderPending = false;
        this._seed = 1.0;
        this._sourceCanvas = null;

        const ctxOpts = { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false };
        const gl = canvas.getContext('webgl', ctxOpts)
                || canvas.getContext('experimental-webgl', ctxOpts);
        if (!gl) throw new Error('NO_WEBGL');
        this.gl = gl;

        this._blurProg    = createProgram(gl, vertSrc, blurSrc);
        this._effectsProg = createProgram(gl, vertSrc, effectsSrc);

        /* Full-screen quad: [x,y, u,v] x 6 vertices */
        const verts = new Float32Array([
            -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
            -1, 1, 0,1,  1,-1, 1,0,   1,1, 1,1,
        ]);
        this._quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        this._origTex = null;
        this._fboH = null;
        this._fboV = null;
        this._imgW = 0;
        this._imgH = 0;
    }

    /* ---- private ---- */
    _bindQuad(prog) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
        const pos = gl.getAttribLocation(prog, 'a_position');
        const tex = gl.getAttribLocation(prog, 'a_texcoord');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(tex);
        gl.vertexAttribPointer(tex, 2, gl.FLOAT, false, 16, 8);
    }

    _bindTex(prog, name, unit, texture) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(prog, name), unit);
    }

    _blurRadius() {
        const p = this._params;
        const clarityR = Math.abs(p.clarity || 0) > 0.01 ? 16 : 2;
        const lensR    = (p.blur || 0) * 48;
        return Math.max(clarityR, lensR, 2);
    }

    _doBlurPass() {
        const gl = this.gl;
        const w = this._imgW, h = this._imgH;
        const prog = this._blurProg;
        const r = this._blurRadius();

        gl.useProgram(prog);
        this._bindQuad(prog);
        gl.uniform2f(gl.getUniformLocation(prog, 'u_texel_size'), 1/w, 1/h);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_radius'), r);

        // Horizontal pass: orig → fboH
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboH.fbo);
        gl.viewport(0, 0, w, h);
        gl.uniform2f(gl.getUniformLocation(prog, 'u_direction'), 1, 0);
        this._bindTex(prog, 'u_image', 0, this._origTex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Vertical pass: fboH → fboV
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboV.fbo);
        gl.viewport(0, 0, w, h);
        gl.uniform2f(gl.getUniformLocation(prog, 'u_direction'), 0, 1);
        this._bindTex(prog, 'u_image', 0, this._fboH.tex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this._needsBlur = false;
    }

    _doEffectsPass(time) {
        const gl = this.gl;
        const p = this._params;
        const prog = this._effectsProg;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(prog);
        this._bindQuad(prog);

        this._bindTex(prog, 'u_image',   0, this._origTex);
        this._bindTex(prog, 'u_blurred', 1, this._fboV.tex);

        const u = (n) => gl.getUniformLocation(prog, n);

        gl.uniform1f(u('u_time'),          time);
        gl.uniform1f(u('u_show_original'), this._showOrig ? 1 : 0);

        gl.uniform1f(u('u_exposure'),    p.exposure    || 0);
        gl.uniform1f(u('u_contrast'),    p.contrast    || 0);
        gl.uniform1f(u('u_shadows'),     p.shadows     || 0);
        gl.uniform1f(u('u_highlights'),  p.highlights  || 0);
        gl.uniform1f(u('u_blacks'),      p.blacks      || 0);
        gl.uniform1f(u('u_whites'),      p.whites      || 0);
        gl.uniform1f(u('u_fade'),        p.fade        || 0);

        gl.uniform1f(u('u_temp'),        p.temp        || 0);
        gl.uniform1f(u('u_tint'),        p.tint        || 0);
        gl.uniform1f(u('u_saturation'),  p.saturation  || 0);
        gl.uniform1f(u('u_vibrance'),    p.vibrance    || 0);

        const st = p.shadow_tint    || [0.55,0.63,0.70];
        const ht = p.highlight_tint || [0.96,0.83,0.62];
        gl.uniform3f(u('u_shadow_tint'),       st[0], st[1], st[2]);
        gl.uniform1f(u('u_shadow_strength'),   p.shadow_strength    || 0);
        gl.uniform3f(u('u_highlight_tint'),    ht[0], ht[1], ht[2]);
        gl.uniform1f(u('u_highlight_strength'),p.highlight_strength || 0);

        gl.uniform1f(u('u_clarity'),     p.clarity     || 0);
        gl.uniform1f(u('u_blur'),        p.blur        || 0);

        gl.uniform1f(u('u_grain_amount'),    p.grain_amount    || 0);
        gl.uniform1f(u('u_grain_size'),      p.grain_size      ?? 0.5);
        gl.uniform1f(u('u_grain_roughness'), p.grain_roughness ?? 0.5);
        gl.uniform1f(u('u_vignette'),        p.vignette        || 0);
        gl.uniform1f(u('u_vignette_shape'),  p.vignette_shape  || 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /* ---- public ---- */
    loadImage(imgOrCanvas) {
        let w = imgOrCanvas.naturalWidth || imgOrCanvas.width;
        let h = imgOrCanvas.naturalHeight || imgOrCanvas.height;
        if (w > MAX_DIM || h > MAX_DIM) {
            const s = MAX_DIM / Math.max(w, h);
            w = Math.round(w * s);
            h = Math.round(h * s);
        }

        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = w;
        baseCanvas.height = h;
        const ctx = baseCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgOrCanvas, 0, 0, w, h);

        this.loadSourceCanvas(baseCanvas);
    }

    loadSourceCanvas(sourceCanvas) {
        const gl = this.gl;
        this._sourceCanvas = sourceCanvas;
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        this._imgW = w;
        this._imgH = h;
        this.canvas.width = w;
        this.canvas.height = h;

        if (this._origTex) gl.deleteTexture(this._origTex);
        this._origTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._origTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        destroyFBO(gl, this._fboH);
        destroyFBO(gl, this._fboV);
        this._fboH = makeFBO(gl, w, h);
        this._fboV = makeFBO(gl, w, h);

        this._hasImage = true;
        this._needsBlur = true;
        this.render();
    }

    rotate(deg = 90) {
        if (!this._hasImage || !this._sourceCanvas) return;
        const src = this._sourceCanvas;
        const rad = (deg * Math.PI) / 180;
        const is90 = Math.abs(deg % 180) === 90;
        const dw = is90 ? src.height : src.width;
        const dh = is90 ? src.width : src.height;

        const next = document.createElement('canvas');
        next.width = dw;
        next.height = dh;
        const ctx = next.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.translate(dw / 2, dh / 2);
        ctx.rotate(rad);
        ctx.drawImage(src, -src.width / 2, -src.height / 2);

        this.loadSourceCanvas(next);
    }

    render() {
        if (!this._hasImage) return;
        if (this._needsBlur) this._doBlurPass();
        this._doEffectsPass(this._seed);
    }

    setParam(key, value) {
        const blurRelated = key === 'clarity' || key === 'blur';
        this._params[key] = value;
        if (blurRelated) this._needsBlur = true;

        if (!this._renderPending) {
            this._renderPending = true;
            requestAnimationFrame(() => {
                this._renderPending = false;
                this.render();
            });
        }
    }

    setParams(params) {
        const blurRelated = Object.keys(params).some(k => k === 'clarity' || k === 'blur');
        Object.assign(this._params, params);
        if (blurRelated) this._needsBlur = true;
        this.render();
    }

    setShowOriginal(show) {
        this._showOrig = show;
        if (this._hasImage) {
            this._doEffectsPass(this._seed);
        }
    }

    get params() { return this._params; }

    get imageSize() { return { w: this._imgW, h: this._imgH }; }
}