// Part I - Babbling Brook

function createBrownNoiseSource(ctx, seconds = 5) {
  const bufferSize = Math.floor(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

class BrookSynth {
  constructor() {
    this.ctx = ensureAudioContext();
    this.nodes = null;
    this.isPlaying = false;
  }

  start(settings) {
    if (this.isPlaying) {
      this.update(settings);
      return;
    }

    const ctx = this.ctx;

    const noise = createBrownNoiseSource(ctx);
    const modNoise = createBrownNoiseSource(ctx);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = settings.noiseLPF;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = settings.modOffset;
    highpass.Q.value = 20;

    const modFilter = ctx.createBiquadFilter();
    modFilter.type = "lowpass";
    modFilter.frequency.value = settings.modLPF;

    const modGain = ctx.createGain();
    modGain.gain.value = settings.modDepth;

    const modOffset = ctx.createConstantSource();
    modOffset.offset.value = settings.modOffset;

    const out = ctx.createGain();
    out.gain.value = settings.outputGain;

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(out);
    out.connect(ctx.destination);

    modNoise.connect(modFilter);
    modFilter.connect(modGain);
    modGain.connect(highpass.frequency);
    modOffset.connect(highpass.frequency);

    noise.start();
    modNoise.start();
    modOffset.start();

    this.nodes = { noise, modNoise, lowpass, highpass, modFilter, modGain, modOffset, out };
    this.isPlaying = true;
  }

  update(settings) {
    if (!this.nodes) return;
    const { lowpass, highpass, modFilter, modGain, modOffset, out } = this.nodes;
    lowpass.frequency.value = settings.noiseLPF;
    modFilter.frequency.value = settings.modLPF;
    modGain.gain.value = settings.modDepth;
    modOffset.offset.value = settings.modOffset;
    out.gain.value = settings.outputGain;
    if (highpass.frequency.value < 10) highpass.frequency.value = 10;
  }

  stop() {
    if (!this.nodes) return;
    try { this.nodes.noise.stop(); } catch (e) {}
    try { this.nodes.modNoise.stop(); } catch (e) {}
    try { this.nodes.modOffset.stop(); } catch (e) {}

    const values = Object.values(this.nodes);
    values.forEach(node => {
      try { node.disconnect(); } catch (e) {}
    });

    this.nodes = null;
    this.isPlaying = false;
  }
}

const brook = new BrookSynth();

function getBrookSettings() {
  return {
    noiseLPF: parseFloat(document.getElementById("noiseLPF").value),
    modLPF: parseFloat(document.getElementById("modLPF").value),
    modDepth: parseFloat(document.getElementById("modDepth").value),
    modOffset: parseFloat(document.getElementById("modOffset").value),
    outputGain: parseFloat(document.getElementById("brookGain").value)
  };
}

document.getElementById("startBrookBtn").addEventListener("click", async () => {
  await resumeAudio();
  brook.start(getBrookSettings());
});

document.getElementById("stopBrookBtn").addEventListener("click", () => {
  brook.stop();
});

bindRange("noiseLPF", "noiseLPFVal", 0, () => {
  if (brook.isPlaying) brook.update(getBrookSettings());
});
bindRange("modLPF", "modLPFVal", 0, () => {
  if (brook.isPlaying) brook.update(getBrookSettings());
});
bindRange("modDepth", "modDepthVal", 0, () => {
  if (brook.isPlaying) brook.update(getBrookSettings());
});
bindRange("modOffset", "modOffsetVal", 0, () => {
  if (brook.isPlaying) brook.update(getBrookSettings());
});
bindRange("brookGain", "brookGainVal", 3, () => {
  if (brook.isPlaying) brook.update(getBrookSettings());
});