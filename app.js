'use strict';
const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('frame');
const context = canvas.getContext('2d');
let model;
let stream;
let running = false;
let busy = false;
let generation = 0;
let frameId;
let rows = [];

function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}

function resetResults() {
  $('top-match').textContent = 'Waiting to see';
  $('result-note').textContent = 'Start your camera to see a prediction.';
  rows.forEach(({ value, bar }) => { value.textContent = '—'; bar.value = 0; });
}

function stop() {
  generation++;
  running = false;
  cancelAnimationFrame(frameId);
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  video.hidden = true;
  $('camera-empty').hidden = false;
  $('camera-status').textContent = 'Off';
  $('camera-status').classList.remove('live');
  $('stop').disabled = true;
  $('start').disabled = busy;
  resetResults();
}

async function start() {
  if (busy || running) return;
  busy = true;
  const session = ++generation;
  $('start').disabled = true;
  $('start').textContent = 'Starting…';
  try {
    if (location.protocol === 'file:') throw new Error('Open this page through a local server: run python3 -m http.server 8000 in this folder, then visit localhost:8000.');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost in a browser that supports a camera.');
    if (!window.tmImage || !window.tf) throw new Error('The image libraries could not load. Check your internet connection and reload the page.');
    message('Loading your image model…');
    if (!model) {
      // Load the exported model from the model directory.
      model = await tmImage.load('./model/model.json', './model/metadata.json');
      $('predictions').replaceChildren();
      rows = model.getClassLabels().map((label) => {
        const row = document.createElement('div'); row.className = 'prediction';
        const heading = document.createElement('div'); heading.className = 'prediction-label';
        const name = document.createElement('span'); name.textContent = label;
        const value = document.createElement('span'); value.className = 'prediction-value'; value.textContent = '—';
        const bar = document.createElement('progress'); bar.max = 1; bar.value = 0; bar.setAttribute('aria-label', label + ' confidence');
        heading.append(name, value); row.append(heading, bar); $('predictions').append(row);
        return { value, bar };
      });
      $('class-count').textContent = `${rows.length} CLASSES`;
    }
    if (session !== generation) return;
    message('Allow camera access in your browser to continue.');
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    if (session !== generation) { acquired.getTracks().forEach((track) => track.stop()); return; }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (session !== generation) return;
    video.hidden = false;
    $('camera-empty').hidden = true;
    running = true;
    $('stop').disabled = false;
    $('camera-status').textContent = 'Live';
    $('camera-status').classList.add('live');
    message('Camera is live. Move your subject into view.');
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (session !== generation) return;
      stop(); message('Camera disconnected. Reconnect it and try again.', true);
    });
    frameId = requestAnimationFrame(() => predict(session));
  } catch (error) {
    if (session !== generation) return;
    stop();
    const errors = {
      NotAllowedError: 'Camera access was denied. Allow it in your browser’s site settings, then try again.',
      NotFoundError: 'No camera was found. Connect a camera and try again.',
      NotReadableError: 'The camera is unavailable. Close other apps using it and try again.'
    };
    message(errors[error.name] || error.message || 'Could not start the model. Check your connection and try again.', true);
  } finally {
    busy = false;
    $('start').textContent = 'Start camera ↗';
    $('start').disabled = running;
  }
}

async function predict(session) {
  if (!running || session !== generation) return;
  try {
    // Center-crop to the same square shown in the training tool, then mirror.
    const size = Math.min(video.videoWidth, video.videoHeight);
    if (size) {
      context.save();
      context.translate(canvas.width, 0); context.scale(-1, 1);
      context.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
      context.restore();
      const predictions = await model.predict(canvas);
      if (!running || session !== generation) return;
      let best = predictions[0];
      predictions.forEach((prediction, index) => {
        rows[index].value.textContent = `${(prediction.probability * 100).toFixed(1)}%`;
        rows[index].bar.value = prediction.probability;
        if (prediction.probability > best.probability) best = prediction;
      });
      $('top-match').textContent = best.className;
      $('result-note').textContent = `${(best.probability * 100).toFixed(1)}% confidence · Updating live`;
    }
    frameId = requestAnimationFrame(() => predict(session));
  } catch (error) {
    if (session !== generation) return;
    stop(); message('Prediction stopped. Please start the camera again. ' + error.message, true);
  }
}

$('start').addEventListener('click', start);
$('stop').addEventListener('click', () => { stop(); message('Camera stopped. Start it again whenever you’re ready.'); });
window.addEventListener('pagehide', stop);
if (location.protocol === 'file:') message('Use a local server to load the model. See README.md for the one-line setup.', true);
