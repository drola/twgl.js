(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../dist/4.x/twgl-full.js", "../3rdparty/chroma.min.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var twgl = require("../dist/4.x/twgl-full.js");
    var chroma = require("../3rdparty/chroma.min.js");
    var onePointVS = "\nuniform mat4 u_worldViewProjection;\n\nattribute vec4 a_position;\nattribute vec2 a_texcoord;\n\nvarying vec4 v_position;\nvarying vec2 v_texCoord;\n\nvoid main() {\n  v_texCoord = a_texcoord;\n  gl_Position = u_worldViewProjection * a_position;\n}\n";
    var onePointFS = "\nprecision mediump float;\n\nvarying vec4 v_position;\nvarying vec2 v_texCoord;\n\nuniform vec4 u_diffuseMult;\nuniform sampler2D u_diffuse;\n\nvoid main() {\n  vec4 diffuseColor = texture2D(u_diffuse, v_texCoord) * u_diffuseMult;\n  if (diffuseColor.a < 0.1) {\n    discard;\n  }\n  gl_FragColor = diffuseColor;\n}\n";
    var envMapVS = "\nuniform mat4 u_viewInverse;\nuniform mat4 u_world;\nuniform mat4 u_worldViewProjection;\nuniform mat4 u_worldInverseTranspose;\n\nattribute vec4 a_position;\nattribute vec3 a_normal;\n\nvarying vec3 v_normal;\nvarying vec3 v_surfaceToView;\n\nvoid main() {\n  v_normal = (u_worldInverseTranspose * vec4(a_normal, 0)).xyz;\n  v_surfaceToView = (u_viewInverse[3] - (u_world * a_position)).xyz;\n  gl_Position = u_worldViewProjection * a_position;\n}\n";
    var envMapFS = "\nprecision mediump float;\n\nuniform samplerCube u_texture;\n\nvarying vec3 v_surfaceToView;\nvarying vec3 v_normal;\n\nvoid main() {\n  vec3 normal = normalize(v_normal);\n  vec3 surfaceToView = normalize(v_surfaceToView);\n  vec4 color = textureCube(u_texture, -reflect(surfaceToView, normal));\n  gl_FragColor = color;\n}\n";
    twgl.setDefaults({ attribPrefix: "a_" });
    var m4 = twgl.m4;
    var gl = document.querySelector("#c").getContext("webgl");
    var onePointProgramInfo = twgl.createProgramInfo(gl, [onePointVS, onePointFS]);
    var envMapProgramInfo = twgl.createProgramInfo(gl, [envMapVS, envMapFS]);
    var shapes = [
        twgl.primitives.createCubeBufferInfo(gl, 2),
        twgl.primitives.createSphereBufferInfo(gl, 1, 24, 12),
        twgl.primitives.createPlaneBufferInfo(gl, 2, 2),
        twgl.primitives.createTruncatedConeBufferInfo(gl, 1, 0, 2, 24, 1),
    ];
    function rand(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + Math.random() * (max - min);
    }
    var baseHue = rand(360);
    var camera = m4.identity();
    var view = m4.identity();
    var viewProjection = m4.identity();
    var ctx = document.createElement("canvas").getContext("2d");
    ctx.canvas.width = 64;
    ctx.canvas.height = 64;
    function updateCanvas(time) {
        ctx.fillStyle = "#00f";
        ctx.strokeStyle = "#ff0";
        ctx.lineWidth = 10;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.beginPath();
        ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.width / 2.2 * Math.abs(Math.cos(time)), 0, Math.PI * 2);
        ctx.stroke();
    }
    updateCanvas(0);
    var cubemapCtx = document.createElement("canvas").getContext("2d");
    var size = 40;
    cubemapCtx.canvas.width = size * 6;
    cubemapCtx.canvas.height = size;
    cubemapCtx.fillStyle = "#888";
    for (var ff = 0; ff < 6; ++ff) {
        var color = chroma.hsv((baseHue + ff * 10) % 360, 1 - ff / 6, 1);
        cubemapCtx.fillStyle = color.darken().hex();
        cubemapCtx.fillRect(size * ff, 0, size, size);
        cubemapCtx.save();
        cubemapCtx.translate(size * (ff + 0.5), size * 0.5);
        cubemapCtx.beginPath();
        cubemapCtx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        cubemapCtx.fillStyle = color.hex();
        cubemapCtx.fill();
        cubemapCtx.restore();
    }
    var cubeFaceCanvases = [];
    for (var ff = 0; ff < 6; ++ff) {
        var canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        var ctx_1 = canvas.getContext("2d");
        var color = chroma.hsv((baseHue + ff * 10) % 360, 1 - ff / 6, 1);
        ctx_1.fillStyle = color.darken().hex();
        ctx_1.fillRect(0, 0, 128, 128);
        ctx_1.translate(64, 64);
        ctx_1.rotate(Math.PI * .25);
        ctx_1.fillStyle = color.hex();
        ctx_1.fillRect(-40, -40, 80, 80);
        cubeFaceCanvases.push(canvas);
    }
    var textures = twgl.createTextures(gl, {
        hftIcon: { src: "images/hft-icon-16.png", mag: gl.NEAREST },
        clover: { src: "images/clover.jpg" },
        fromCanvas: { src: ctx.canvas },
        yokohama: {
            target: gl.TEXTURE_CUBE_MAP,
            src: [
                'images/yokohama/posx.jpg',
                'images/yokohama/negx.jpg',
                'images/yokohama/posy.jpg',
                'images/yokohama/negy.jpg',
                'images/yokohama/posz.jpg',
                'images/yokohama/negz.jpg',
            ],
        },
        goldengate: {
            target: gl.TEXTURE_CUBE_MAP,
            src: 'images/goldengate.jpg',
        },
        checker: {
            mag: gl.NEAREST,
            min: gl.LINEAR,
            src: [
                255, 255, 255, 255,
                192, 192, 192, 255,
                192, 192, 192, 255,
                255, 255, 255, 255,
            ],
        },
        stripe: {
            mag: gl.NEAREST,
            min: gl.LINEAR,
            format: gl.LUMINANCE,
            src: new Uint8Array([
                255,
                128,
                255,
                128,
                255,
                128,
                255,
                128,
            ]),
            width: 1,
        },
        cubemapFromArray: {
            target: gl.TEXTURE_CUBE_MAP,
            format: gl.RGBA,
            src: [
                0xF0, 0x80, 0x80, 0xFF,
                0x80, 0xE0, 0x80, 0xFF,
                0x80, 0x80, 0xD0, 0xFF,
                0xC0, 0x80, 0x80, 0xFF,
                0x80, 0xB0, 0x80, 0xFF,
                0x80, 0x80, 0x00, 0xFF,
            ],
        },
        cubemapFromCanvas: { target: gl.TEXTURE_CUBE_MAP, src: cubemapCtx.canvas },
        cubemapFrom6Canvases: { target: gl.TEXTURE_CUBE_MAP, src: cubeFaceCanvases },
    });
    var twoDTextures = [
        textures.checker,
        textures.stripe,
        textures.hftIcon,
        textures.clover,
        textures.fromCanvas,
    ];
    var cubeTextures = [
        textures.yokohama,
        textures.goldengate,
        textures.cubemapFromCanvas,
        textures.cubemapFrom6Canvases,
        textures.cubemapFromArray,
    ];
    var objects = [];
    var drawObjects = [];
    var numObjects = 100;
    for (var ii = 0; ii < numObjects; ++ii) {
        var uniforms = void 0;
        var programInfo = void 0;
        var shape = void 0;
        var renderType = rand(0, 2) | 0;
        switch (renderType) {
            case 0:
                shape = shapes[ii % shapes.length];
                programInfo = onePointProgramInfo;
                uniforms = {
                    u_diffuseMult: chroma.hsv((baseHue + rand(0, 60)) % 360, 0.4, 0.8).gl(),
                    u_diffuse: twoDTextures[rand(0, twoDTextures.length) | 0],
                    u_viewInverse: camera,
                    u_world: m4.identity(),
                    u_worldInverseTranspose: m4.identity(),
                    u_worldViewProjection: m4.identity(),
                };
                break;
            case 1:
                shape = rand(0, 2) < 1 ? shapes[1] : shapes[3];
                programInfo = envMapProgramInfo;
                uniforms = {
                    u_texture: cubeTextures[rand(0, cubeTextures.length) | 0],
                    u_viewInverse: camera,
                    u_world: m4.identity(),
                    u_worldInverseTranspose: m4.identity(),
                    u_worldViewProjection: m4.identity(),
                };
                break;
            default:
                throw "wAT!";
        }
        drawObjects.push({
            programInfo: programInfo,
            bufferInfo: shape,
            uniforms: uniforms,
        });
        objects.push({
            translation: [rand(-10, 10), rand(-10, 10), rand(-10, 10)],
            ySpeed: rand(0.1, 0.3),
            zSpeed: rand(0.1, 0.3),
            uniforms: uniforms,
        });
    }
    function render(time) {
        time *= 0.001;
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        var radius = 20;
        var orbitSpeed = time * 0.1;
        var projection = m4.perspective(30 * Math.PI / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 100);
        var eye = [Math.cos(orbitSpeed) * radius, 4, Math.sin(orbitSpeed) * radius];
        var target = [0, 0, 0];
        var up = [0, 1, 0];
        m4.lookAt(eye, target, up, camera);
        m4.inverse(camera, view);
        m4.multiply(projection, view, viewProjection);
        updateCanvas(time);
        twgl.setTextureFromElement(gl, textures.fromCanvas, ctx.canvas);
        objects.forEach(function (obj) {
            var uni = obj.uniforms;
            var world = uni.u_world;
            m4.identity(world);
            m4.rotateY(world, time * obj.ySpeed, world);
            m4.rotateZ(world, time * obj.zSpeed, world);
            m4.translate(world, obj.translation, world);
            m4.rotateX(world, time, world);
            m4.transpose(m4.inverse(world, uni.u_worldInverseTranspose), uni.u_worldInverseTranspose);
            m4.multiply(viewProjection, uni.u_world, uni.u_worldViewProjection);
        });
        twgl.drawObjectList(gl, drawObjects);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
});
//# sourceMappingURL=textures-typescript.js.map