const TOPIC = "karry/esp01/testbutton";
const WS_URL = "ws://test.mosquitto.org:8080/mqtt";
const WSS_URL = "wss://test.mosquitto.org:8081/mqtt";
const BROKER_URL = window.location.protocol === "https:" ? WSS_URL : WS_URL;

const statusEl = document.getElementById("status");
const btn = document.getElementById("holdBtn");
const hintEl = document.getElementById("hint");

let client = null;
let pressed = false;

const setStatus = (text, kind) => {
  statusEl.textContent = text;
  statusEl.className = kind;
};

const setButtonEnabled = (enabled) => {
  btn.disabled = !enabled;
  if (!enabled) {
    btn.classList.remove("sending");
  }
};

function publish(msg) {
  if (client && client.connected) {
    client.publish(TOPIC, msg, { qos: 0, retain: false });
  }
}

function setPressed(next) {
  if (pressed === next) return;
  pressed = next;
  btn.classList.toggle("sending", pressed);
  publish(pressed ? "ON" : "OFF");
  hintEl.textContent = pressed
    ? "Holding button: ON sent."
    : "Released: OFF sent. Press again to turn ON.";
}

function connectMqtt() {
  if (!window.mqtt) {
    setStatus("Disconnected", "disconnected");
    setButtonEnabled(false);
    hintEl.textContent = "MQTT.js failed to load.";
    return;
  }

  setStatus("Connecting", "connecting");
  setButtonEnabled(false);
  hintEl.textContent = "Connecting to MQTT broker...";

  client = window.mqtt.connect(BROKER_URL, {
    clientId: "web-" + Math.random().toString(16).slice(2, 10),
    clean: true,
    reconnectPeriod: 2000
  });

  client.on("connect", () => {
    setStatus("Connected", "connected");
    setButtonEnabled(true);
    hintEl.textContent = "Press and hold to send ON. Release to send OFF.";
  });

  client.on("reconnect", () => {
    setStatus("Connecting", "connecting");
    setButtonEnabled(false);
  });

  client.on("close", () => {
    setStatus("Disconnected", "disconnected");
    setButtonEnabled(false);
    setPressed(false);
  });

  client.on("offline", () => {
    setStatus("Disconnected", "disconnected");
    setButtonEnabled(false);
    setPressed(false);
  });

  client.on("error", (e) => {
    setStatus("Disconnected", "disconnected");
    setButtonEnabled(false);
    setPressed(false);
    hintEl.textContent = "MQTT error: " + e.message;
  });
}

btn.addEventListener("pointerdown", (e) => {
  if (btn.disabled || e.button !== 0) return;
  e.preventDefault();
  if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
  setPressed(true);
});

btn.addEventListener("pointerup", () => setPressed(false));
btn.addEventListener("pointercancel", () => setPressed(false));
btn.addEventListener("lostpointercapture", () => setPressed(false));
btn.addEventListener("mouseleave", () => setPressed(false));
window.addEventListener("blur", () => setPressed(false));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPressed(false);
});
window.addEventListener("beforeunload", () => {
  setPressed(false);
  if (client) client.end(true);
});

connectMqtt();
