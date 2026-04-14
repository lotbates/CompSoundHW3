// Part II - Alarm Generator

function smoothParam(param, value, time, tau = 0.015) {
  param.cancelScheduledValues(time);
  param.setTargetAtTime(value, time, tau);
}

class AlarmSynth {
  constructor() {
    this.ctx = ensureAudioContext();
    this.master = null;
    this.hp = null;
    this.voices = new Map();
    this.sequence = [800, 600];
    this.stepDur = 0.5;
    this.waveform = "triangle";
    this.intervalId = null;
    this.index = 0;
    this.isPlaying = false;
    this.masterGain = 0.15;
    this.buildGraph();
  }

  buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.masterGain;

    this.hp = ctx.createBiquadFilter();
    this.hp.type = "highpass";
    this.hp.frequency.value = 50;

    this.master.connect(this.hp);
    this.hp.connect(ctx.destination);
  }

  rebuildVoices() {
    for (const voice of this.voices.values()) {
      try { voice.osc.stop(); } catch (e) {}
      try { voice.osc.disconnect(); } catch (e) {}
      try { voice.gain.disconnect(); } catch (e) {}
    }
    this.voices.clear();

    const uniqueFreqs = [...new Set(this.sequence)];
    uniqueFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = this.waveform;
      osc.frequency.value = freq;

      // slight vibrato-ish detune for a more alert-like sound
      osc.detune.value = 0;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(this.master);
      osc.start();

      this.voices.set(freq, { osc, gain });
    });
  }

  triggerStep() {
    const now = this.ctx.currentTime;
    const freq = this.sequence[this.index];

    for (const [f, voice] of this.voices.entries()) {
      const target = (f === freq) ? 1.0 : 0.0;
      smoothParam(voice.gain.gain, target, now, 0.014);
    }

    this.index = (this.index + 1) % this.sequence.length;
  }

  start() {
    if (this.isPlaying) return;
    this.rebuildVoices();
    this.index = 0;
    this.triggerStep();
    this.intervalId = setInterval(() => this.triggerStep(), this.stepDur * 1000);
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying) return;
    clearInterval(this.intervalId);
    const now = this.ctx.currentTime;

    for (const voice of this.voices.values()) {
      smoothParam(voice.gain.gain, 0, now, 0.02);
    }

    setTimeout(() => {
      for (const voice of this.voices.values()) {
        try { voice.osc.stop(); } catch (e) {}
        try { voice.osc.disconnect(); } catch (e) {}
        try { voice.gain.disconnect(); } catch (e) {}
      }
      this.voices.clear();
    }, 120);

    this.isPlaying = false;
  }

  setSequence(sequence) {
    this.sequence = sequence;
    document.getElementById("sequenceLabel").textContent = sequence.join(", ");
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setStepDuration(seconds) {
    this.stepDur = seconds;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setWaveform(type) {
    this.waveform = type;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setMasterGain(value) {
    this.masterGain = value;
    if (this.master) this.master.gain.value = value;
  }
}

const alarm = new AlarmSynth();

document.getElementById("startAlarmBtn").addEventListener("click", async () => {
  await resumeAudio();
  alarm.start();
});

document.getElementById("stopAlarmBtn").addEventListener("click", () => {
  alarm.stop();
});

document.getElementById("twoToneBtn").addEventListener("click", () => {
  alarm.setSequence([800, 600]);
  alarm.setStepDuration(parseFloat(document.getElementById("stepDur").value));
});

document.getElementById("threeToneBtn").addEventListener("click", () => {
  alarm.setSequence([723, 932, 1012]);
  alarm.setStepDuration(0.25);
  document.getElementById("stepDur").value = "0.25";
  setText("stepDurVal", "0.25");
});

document.getElementById("messageBtn").addEventListener("click", () => {
  alarm.setSequence([619, 571, 365]);
  alarm.setStepDuration(0.22);
  document.getElementById("stepDur").value = "0.22";
  setText("stepDurVal", "0.22");
});

document.getElementById("errorBtn").addEventListener("click", () => {
  alarm.setSequence([714, 1000, 1000, 1000]);
  alarm.setStepDuration(0.10);
  document.getElementById("stepDur").value = "0.10";
  setText("stepDurVal", "0.10");
});

bindRange("stepDur", "stepDurVal", 2, (v) => {
  alarm.setStepDuration(v);
});

bindRange("alarmGain", "alarmGainVal", 3, (v) => {
  alarm.setMasterGain(v);
});

document.getElementById("alarmWaveform").addEventListener("change", (e) => {
  alarm.setWaveform(e.target.value);
});