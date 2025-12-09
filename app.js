let audioCtx;
let osc, gain, filter, bitCrusherNode;
let active = false;

const audioBtn = document.getElementById("audio-btn");
if (audioBtn) {
    audioBtn.addEventListener("click", toggleAudio);
}

function toggleAudio() {
    if (!audioCtx) audioCtx = new AudioContext();

    if (!active) {
        audioCtx.resume();
        audioBtn.style.background = "#d10086";
        audioBtn.style.color = "white";
        active = true;
    } else {
        audioCtx.suspend();
        audioBtn.style.background = "#ff99cc";
        active = false;
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
        for (let i=0; i<input.length; i++) {
            output[i] = Math.round(input[i] * bitCrusherNode.norm) / bitCrusherNode.norm;
        }
    };

    osc.frequency.value = freq;
    osc.type = document.getElementById("wave").value;

    osc.connect(filter);
    filter.connect(bitCrusherNode);
    bitCrusherNode.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.value = 0.2;

    osc.start();
}

function stop() {
    if (osc) osc.stop();
}

document.querySelectorAll(".key").forEach(key=>{
    key.addEventListener("mousedown", ()=>{
        play(parseFloat(key.dataset.note));
    });
    key.addEventListener("mouseup", stop);
});

document.getElementById("wave")?.addEventListener("change", e=>{
    if (osc) osc.type = e.target.value;
});

document.getElementById("filter")?.addEventListener("input", e=>{
    if (filter) filter.frequency.value = e.target.value;
});

document.getElementById("detune")?.addEventListener("input", e=>{
    if (osc) osc.detune.value = e.target.value;
});

document.getElementById("crush")?.addEventListener("input", e=>{
    if (bitCrusherNode) {
        let bits = parseInt(e.target.value);
        bitCrusherNode.bits = bits;
        bitCrusherNode.norm = Math.pow(2, bits - 1);
    }
});


// ---------------------------
// SCOPES
// ---------------------------
const canvases = [
    document.getElementById("scope1"),
    document.getElementById("scope2"),
    document.getElementById("scope3")
];

const colors = ["#ffcc00", "#ff3377", "#3399ff"];

function resize() {
    canvases.forEach(c=>{
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

    let dummyOsc = audioCtx.createOscillator();
    let dummyGain = audioCtx.createGain();
    dummyGain.gain.value = 0.0001;
    dummyOsc.connect(dummyGain);
    dummyGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    dummyOsc.start();
}

initAnalyser();

function draw() {
    requestAnimationFrame(draw);

    let buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);

    canvases.forEach((c,i)=>{
        let ctx = c.getContext("2d");
        ctx.clearRect(0,0,c.width,c.height);

        ctx.lineWidth = 4;
        ctx.strokeStyle = colors[i];

        ctx.beginPath();
        for (let x=0; x<c.width; x++){
            let v = buffer[x] / 128.0;
            let y = (v * c.height)/2;
            if (x===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        }
        ctx.stroke();
    });
}

draw();
