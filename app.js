let audioCtx;
let osc, gain, filter, bitCrusherNode;
let active = false;

const audioBtn = document.getElementById("audio-btn");
if (audioBtn) audioBtn.addEventListener("click", toggleAudio);

function toggleAudio() {
    if (!audioCtx) audioCtx = new AudioContext();

    if (!active) {
        audioCtx.resume();
        active = true;
        audioBtn.style.background = "#d10086";
    } else {
        audioCtx.suspend();
        active = false;
        audioBtn.style.background = "#ff99cc";
    }
}

function play(freq) {
    if (!audioCtx || audioCtx.state !== "running") return;

    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";

    bitCrusherNode = audioCtx.createScriptProcessor(256, 1, 1);
    bitCrusherNode.bits = 16;
    bitCrusherNode.norm = Math.pow(2, bitCrusherNode.bits - 1);

    bitCrusherNode.onaudioprocess = function(e) {
        let input = e.inputBuffer.getChannelData(0);
        let output = e.outputBuffer.getChannelData(0);

        for (let i = 0; i < input.length; i++) {
            output[i] = Math.round(input[i] * bitCrusherNode.norm) / bitCrusherNode.norm;
        }
    };

    osc.frequency.value = freq;
    osc.type = document.getElementById("wave").value;

    osc.connect(filter);
    filter.connect(bitCrusherNode);
    bitCrusherNode.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.value = 0.25;

    osc.start();
}

function stop() {
    if (osc) osc.stop();
}

document.querySelectorAll(".key").forEach(key => {
    key.addEventListener("mousedown", () => play(parseFloat(key.dataset.note)));
    key.addEventListener("mouseup", stop);
});

/* KNOBS */

const knobValues = {
    detune: 0,
    filter: 8000,
    crush: 16
};

document.querySelectorAll(".knob").forEach(knob => {
    let angle = 0;

    knob.addEventListener("mousedown", e => {
        const target = knob.dataset.target;

        function move(ev) {
            angle += ev.movementY * -0.5;
            knob.style.transform = `rotate(${angle}deg)`;

            let norm = (angle + 180) / 360;

            if (target === "detune" && osc) osc.detune.value = norm * 100 - 50;
            if (target === "filter" && filter) filter.frequency.value = 200 + norm * 20000;
            if (target === "crush" && bitCrusherNode) {
                let bits = Math.floor(1 + norm * 15);
                bitCrusherNode.bits = bits;
                bitCrusherNode.norm = Math.pow(2, bits - 1);
            }
        }

        function up() {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        }

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    });
});

/* SCOPES */

const canvases = [
    document.getElementById("scope1"),
    document.getElementById("scope2"),
    document.getElementById("scope3")
];

const colors = ["#ffcc00", "#ff3377", "#3399ff"];

function resize() {
    canvases.forEach(c => {
        c.width = c.clientWidth;
        c.height = c.clientHeight;
    });
}
window.addEventListener("resize", resize);
resize();

let analyser;
function initAnalyser() {
    if (!audioCtx) audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    let osc0 = audioCtx.createOscillator();
    let g0 = audioCtx.createGain();
    g0.gain.value = 0.0001;

    osc0.connect(g0);
    g0.connect(analyser);
    analyser.connect(audioCtx.destination);

    osc0.start();
}

initAnalyser();

function draw() {
    requestAnimationFrame(draw);

    let buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);

    canvases.forEach((c, i) => {
        let ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);

        ctx.lineWidth = 6;
        ctx.strokeStyle = colors[i];

        ctx.beginPath();
        for (let x = 0; x < c.width; x++) {
            let v = buffer[x] / 128.0;
            let y = (v * c.height) * 0.75; // ← AMPLITUDE VERGRÖSSERT
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();
    });
}

draw();
