const Menu = require("@electron/remote").Menu;
const { BrowserWindow } = require("@electron/remote");
const dialog = require("@electron/remote").dialog;
//Buttons
const buttonElement = document.getElementById("audioSelectBtn");
const recordButton = document.getElementById("startRecBtn");
const stopButton = document.getElementById("stopRecBtn");

const audioElement = document.getElementById("audioElement");
buttonElement.addEventListener("click", () => {
  getAudioSources();
});

setDefaultSource();

async function setDefaultSource() {
  const defaultSource = await navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      return devices.filter(
        (device) =>
          device.kind === "audioinput" && device.deviceId === "default"
      );
    });

  const constraints = {
    audio: {
      deviceId: { exact: defaultSource[0].deviceId },
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  audioElement.srcObject = stream;

  buttonElement.innerText = defaultSource[0].label;
}

async function getAudioSources() {
  const inputSources = await navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      return devices.filter((device) => device.kind === "audioinput");
    });
  console.log(inputSources);
  const audioOptionsMenu = await Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.label,
        click: () => selectSource(source.deviceId),
      };
    })
  );

  audioOptionsMenu.popup();
}

let mediaRecorder;
const recordedChunks = [];

recordButton.addEventListener("click", (e) => {
  mediaRecorder.start();
  recordButton.classList.add("is-danger");
  recordButton.innerText = "Recording";
});

stopButton.addEventListener("click", (e) => {
  mediaRecorder.stop();
  recordButton.classList.remove("is-danger");
  recordButton.innerText = "Start";
});

async function selectSource(source) {
  console.log(source);
  buttonElement.innerText = source.name;

  const constraints = {
    audio: {
      deviceId: { exact: source },
    },
  };
  const inputSource = await navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      return devices.filter(
        (device) => device.kind === "audioinput" && device.deviceId === source
      );
    });
  console.log(inputSource);
  buttonElement.innerText = inputSource[0].label;
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  audioElement.srcObject = stream;

  // Create media recorder
  const options = { mimeType: "audio/webm" };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e) {
  console.log("data available");
  recordedChunks.push(e.data);
}

const { writeFile } = require("fs").promises;

async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: "audio/wav",
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  const filePath = await dialog.showSaveDialog({
    buttonLabel: "Save audio",
    defaultPath: `audio-${Date.now()}.wav`,
  });

  console.log(filePath.filePath);
  writeFile(filePath.filePath, buffer, () =>
    console.log("audio saved successfully")
  );
}
