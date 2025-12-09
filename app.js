// AUDIO
let audioCtx, osc, gainNode, filterNode, analyser, scriptNode;
let bitDepth = 4;
let audioRunning = false;

const audioBtn = document.getElementById('audio-btn');

function setupAudio() {
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    osc = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    filterNode = audioCtx.createBiquadFilter();
    analyser = audioCtx.createAnalyser();

    osc.type='sawtooth';
    osc.frequency.value=261.63;
    gainNode.gain.value=0.2;
    filterNode.type='lowpass';
    filterNode.frequency.value=20000;

    scriptNode = audioCtx.createScriptProcessor(4096,1,1);
    let phase=0,last=0;
    scriptNode.onaudioprocess = e=>{
        const input=e.inputBuffer.getChannelData(0);
        const output=e.outputBuffer.getChannelData(0);
        for(let i=0;i<input.length;i++){
            phase+=bitDepth/10;
            if(phase>=1){ phase-=1; last=Math.round(input[i]*(1<<bitDepth))/(1<<bitDepth);}
            output[i]=last*0.25;
        }
    };

    osc.connect(scriptNode);
    scriptNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.connect(analyser);

    osc.start();
}

audioBtn.addEventListener('click', ()=>{
    if(!audioRunning){
        setupAudio();
        audioRunning=true;
        audioBtn.style.background="#ffbee5";
        drawScopes();
    } else {
        try{osc.stop();}catch(e){}
        audioCtx.close();
        audioRunning=false;
        audioBtn.style.background="#fff";
    }
});

// KEYBOARD
document.querySelectorAll('.key').forEach(k=>{
    k.addEventListener('mousedown', ()=>{
        if(!osc) return;
        osc.frequency.setValueAtTime(parseFloat(k.dataset.note), audioCtx.currentTime);
    });
});

// KNOBS
function makeKnob(id, callback){
    const k=document.getElementById(id);
    let angle=0;
    k.addEventListener('mousedown', e=>{
        const move=ev=>{
            angle+=-ev.movementY*0.7;
            if(angle>135) angle=135;
            if(angle<-135) angle=-135;
            k.style.transform=`rotate(${angle}deg)`;
            callback((angle+135)/270);
        };
        const up=()=>{window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up);}
        window.addEventListener('mousemove',move);
        window.addEventListener('mouseup',up);
    });
}
makeKnob('detune', v=>{ if(osc) osc.detune.value=v*200-100; });
makeKnob('filter', v=>{ if(filterNode) filterNode.frequency.value=200+v*12000; });
makeKnob('wave', v=>{ if(osc){ const types=['sine','triangle','sawtooth','square']; osc.type=types[Math.floor(v*4)]; }});
makeKnob('crush', v=>bitDepth=Math.floor(1+v*12));

// SCOPES
const canvasPink=document.getElementById('scopePink');
const canvasYellow=document.getElementById('scopeYellow');
const canvasBlue=document.getElementById('scopeBlue');

const ctxPink=canvasPink.getContext('2d');
const ctxYellow=canvasYellow.getContext('2d');
const ctxBlue=canvasBlue.getContext('2d');

function drawSingleScope(ctx,color,amplitude){
    if(!analyser) return;
    const data=new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.lineWidth=4;
    ctx.strokeStyle=color;
    ctx.beginPath();
    let slice=ctx.canvas.width/data.length;
    let x=0;
    for(let i=0;i<data.length;i++){
        const y=(data[i]/128 -1)*amplitude + ctx.canvas.height/2;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        x+=slice;
    }
    ctx.stroke();
}

function drawScopes(){
    if(!audioRunning) return;
    requestAnimationFrame(drawScopes);
    [canvasPink,canvasYellow,canvasBlue].forEach(c=>{c.width=window.innerWidth;c.height=window.innerHeight;});
    drawSingleScope(ctxPink,'rgba(255,0,200,0.8)',window.innerHeight*0.4);
    drawSingleScope(ctxYellow,'rgba(255,255,0,0.6)',window.innerHeight*0.35);
    drawSingleScope(ctxBlue,'rgba(0,120,255,0.6)',window.innerHeight*0.35);
}
