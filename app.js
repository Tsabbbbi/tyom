'use strict';
const $ = id => document.getElementById(id);
const video = $('video');
const canvas = $('frame');
const context = canvas.getContext('2d');
const overlay = $('overlay');
const pen = overlay.getContext('2d');
let stream, timer, controller;
let running = false, busy = false, generation = 0;

function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function stop() {
  generation++;
  running = false;
  clearTimeout(timer);
  controller?.abort();
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  video.hidden = true;
  overlay.hidden = true;
  $('camera-empty').hidden = false;
  $('camera-status').textContent = 'Off';
  $('camera-status').classList.remove('live');
  $('stop').disabled = true;
  $('start').disabled = busy;
  $('top-match').textContent = 'Waiting to see';
  $('result-note').textContent = 'Start your camera to detect objects.';
  $('predictions').replaceChildren();
  $('class-count').textContent = '80 CLASSES';
}
async function api(path, options = {}) {
  controller = new AbortController();
  const requestController = controller;
  const timeout = setTimeout(() => requestController.abort(), 30000);
  try {
    const response = await fetch(path, { ...options, signal: requestController.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Detection service returned ${response.status}.`);
    }
    return await response.json();
  } finally { clearTimeout(timeout); }
}
async function start() {
  if (running || busy) return;
  busy = true;
  const session = ++generation;
  $('start').disabled = true;
  $('start').textContent = 'Starting…';
  try {
    if (location.protocol === 'file:') throw new Error('Run the Python server or Docker container to use object detection. See README.md.');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost.');
    message('Connecting to the object detector…');
    const health = await api('./api/health');
    if (!health.ready) throw new Error('The detector is not ready yet. Try again shortly.');
    if (session !== generation) return;
    message('Allow camera access. Frames will be sent to this server for detection.');
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    if (session !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
    stream = acquired;
    video.srcObject = stream;
    await video.play();
    if (session !== generation) return;
    video.hidden = false;
    overlay.hidden = false;
    $('camera-empty').hidden = true;
    running = true;
    $('stop').disabled = false;
    $('camera-status').textContent = 'Live';
    $('camera-status').classList.add('live');
    message('Detecting objects. Camera frames are processed on the server.');
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (session === generation) { stop(); message('Camera disconnected. Reconnect and try again.', true); }
    });
    predict(session);
  } catch (error) {
    if (session !== generation) return;
    stop();
    const errors = { NotAllowedError: 'Allow camera access in your browser settings and try again.', NotFoundError: 'No camera found. Connect one and try again.', NotReadableError: 'Camera is busy. Close other camera apps and try again.', AbortError: 'The server took too long to respond. Try again shortly.' };
    message(errors[error.name] || error.message, true);
  } finally {
    busy = false;
    $('start').textContent = 'Start camera ↗';
    $('start').disabled = running;
  }
}
function render(detections, milliseconds) {
  pen.clearRect(0, 0, overlay.width, overlay.height);
  $('predictions').replaceChildren();
  $('class-count').textContent = `${detections.length} DETECTED`;
  $('top-match').textContent = detections[0]?.label || 'No objects found';
  $('result-note').textContent = `${milliseconds} ms inference · Latest analyzed frame`;
  for (const detection of detections) {
    const [x, y, w, h] = detection.box.map(value => value * canvas.width);
    pen.strokeStyle = '#8df0bb'; pen.lineWidth = 3;
    pen.strokeRect(x, y, w, h);
    const caption = `${detection.label} ${Math.round(detection.confidence * 100)}%`;
    pen.font = '16px sans-serif';
    const textWidth = pen.measureText(caption).width + 12;
    const labelX = Math.max(0, Math.min(x, overlay.width - textWidth));
    const labelY = Math.max(22, y);
    pen.fillStyle = '#173c30'; pen.fillRect(labelX, labelY - 22, textWidth, 22);
    pen.fillStyle = '#fff'; pen.fillText(caption, labelX + 6, labelY - 6);
    const row = document.createElement('div'); row.className = 'prediction';
    const heading = document.createElement('div'); heading.className = 'prediction-label';
    const name = document.createElement('span'); name.textContent = detection.label;
    const value = document.createElement('span'); value.className = 'prediction-value'; value.textContent = `${(detection.confidence * 100).toFixed(1)}%`;
    const bar = document.createElement('progress'); bar.max = 1; bar.value = detection.confidence; bar.setAttribute('aria-label', `${detection.label} confidence`);
    heading.append(name, value); row.append(heading, bar); $('predictions').append(row);
  }
}
async function predict(session) {
  if (!running || session !== generation) return;
  try {
    const size = Math.min(video.videoWidth, video.videoHeight);
    if (!size) { timer = setTimeout(() => predict(session), 200); return; }
    context.save(); context.translate(canvas.width, 0); context.scale(-1, 1);
    context.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    context.restore();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!running || session !== generation) return;
    if (!blob) throw new Error('Could not capture a camera frame.');
    const result = await api('./api/detect', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
    if (!running || session !== generation) return;
    render(result.detections, result.inference_ms);
    // One request at a time; never queue camera frames behind slow inference.
    timer = setTimeout(() => predict(session), 250);
  } catch (error) {
    if (session !== generation) return;
    stop();
    message(error.name === 'AbortError' ? 'Detection timed out. Start the camera to retry.' : error.message, true);
  }
}
$('start').addEventListener('click', start);
$('stop').addEventListener('click', () => { stop(); message('Camera stopped. No more frames are being sent.'); });
window.addEventListener('pagehide', stop);
