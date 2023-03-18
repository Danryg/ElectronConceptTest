const Menu = require("@electron/remote").Menu;
const { BrowserWindow } = require("@electron/remote");
const dialog = require("@electron/remote").dialog;
const { ipcRenderer } = require("electron");
var fs = require("fs");
//Buttons
const buttonElement = document.getElementById("audioSelectBtn");
const recordButton = document.getElementById("startRecBtn");
const stopButton = document.getElementById("stopRecBtn");
const transcribeButton = document.getElementById("transcribeBtn");
const audioList = document.getElementById("audioList");
console.log(audioList);
const audioElement = document.getElementById("audioElement");

let mediaRecorder;
const recordedChunks = [];

const path = require("path");

//Event listeners
buttonElement.addEventListener("click", () => {
  getAudioSources();
});

transcribeButton.addEventListener("click", () => {
  transcribeAudio();
});

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

// On start
setDefaultSource();
populateAudioList();
// Methods

/**
 * Sets the default audio source to the default audio input device
 * @returns {Promise<void>}
 */
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
  const options = { mimeType: "audio/webm" };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  buttonElement.innerText = defaultSource[0].label;
}

/**
 * Fetches the audio sources and displays them in a menu
 * @returns {Promise<void>}
 */
async function getAudioSources() {
  const inputSources = await navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      return devices.filter((device) => device.kind === "audioinput");
    });
  console.log(inputSources);
  const audioOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.label,
        click: () => selectSource(source.deviceId),
      };
    })
  );

  audioOptionsMenu.popup();
}

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
  ipcRenderer.invoke("read-user-data", "audio").then((result) => {
    if (!fs.existsSync(result)) {
      fs.mkdirSync(result, { recursive: true });
    }
    const name = `${Date.now()}.wav`;
    const filePath = result + `\\${name}`;
    console.log(filePath);

    fs.writeFile(filePath, buffer, { flag: "wx" }, function (err) {
      if (err) throw err;
      appendAudioItem(name, filePath);
      console.log("It's saved!");
    });
    /* writeFile(filePath.filePath, buffer, () =>
      console.log("audio saved successfully")
    ); */
  });
}

async function transcribeAudio(name) {
  const { PythonShell } = require("python-shell");

  console.log("Transcribing", name);
  let pyshell = new PythonShell("transcribe.py");
  pyshell.send(JSON.stringify(name));
  transcribeButton.innerText = "Transcribing...";
  pyshell.on("message", function (message) {
    // received a message sent from the Python script (a simple "print" statement)
    console.log(message);
    const textElement = document.getElementById("transText");
    textElement.innerText = message;
  });

  // end the input stream and allow the process to exit
  pyshell.end(function (err) {
    if (err) throw err;
    transcribeButton.innerText = "Transcribe";

    console.log("finished");
  });
}

async function getAllAudioFIles() {
  const result = await ipcRenderer.invoke("read-user-data", "audio");

  const files = fs.readdirSync(result);

  const audioFiles = files.filter((file) => file.endsWith(".wav"));

  return audioFiles;
}

async function populateAudioList() {
  const audioFiles = await getAllAudioFIles();
  const filesPath = await ipcRenderer.invoke("read-user-data", "audio");

  audioFiles.forEach((file) => {
    const filePath = filesPath + "\\" + file;

    appendAudioItem(file, filePath);
  });
}

async function appendAudioItem(name, path) {
  const listItem = document.createElement("div");
  listItem.classList.add("recordListItem");

  //title
  const title = listItem.appendChild(document.createElement("p"));
  title.innerText = name;

  //audio
  const audioElement = listItem.appendChild(document.createElement("audio"));
  //const audioFile = fs.readFileSync(filesPath + "\\" + file);
  audioElement.src = path;
  audioElement.controls = true;

  //delete button
  const deleteButton = listItem.appendChild(document.createElement("button"));
  deleteButton.classList.add("delete");
  deleteButton.addEventListener("click", () => {});

  const transcribeButton = listItem.appendChild(
    document.createElement("button")
  );
  transcribeButton.id = "transcribeBtn" + name;
  transcribeButton.classList.add("button");
  transcribeButton.innerText = "Transcribe";
  transcribeButton.addEventListener("click", () => {
    const btn = document.getElementById("transcribeBtn" + name);

    btn.innerText = "Transcribing...";
    transcribeAudio(name).then(() => {});
  });
  audioList.appendChild(listItem);
}
