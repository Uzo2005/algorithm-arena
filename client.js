function byteArrayToBase64String(bytes) {
  return btoa(bytes.toString());
}

function base64StringToByteArray(str) {
  const bytesArray = atob(str).split(",");
  const bytes = new Uint8Array(bytesArray.length);
  for (let i = 0; i < bytesArray.length; i++) {
    bytes[i] = parseInt(bytesArray[i]);
  }
  return bytes;
}

async function keyToString(key) {
  const exportedKey = await window.crypto.subtle.exportKey("raw", key);
  const keyBytes = new Uint8Array(exportedKey);
  const keyString = byteArrayToBase64String(keyBytes);
  return keyString;
}

async function importKeyFromArray(keyArray) {
  const keyBuffer = keyArray.buffer;

  const importedKey = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-CBC", length: 128 },
    true,
    ["encrypt", "decrypt"]
  );

  return importedKey;
}

const generateRandomAESKey = async () => {
  return window.crypto.subtle.generateKey(
    { name: "AES-CBC", length: 128 }, //algorithm
    true, //extractable
    ["encrypt", "decrypt"] //keyUsages
  );
};

const encryptData = async (data, key) => {
  const encodedData = new TextEncoder().encode(data); //stream of bytes
  const initializationVector = window.crypto.getRandomValues(
    new Uint8Array(16)
  );

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: initializationVector,
    },
    key,
    encodedData
  );
  return [
    new Uint8Array(encryptedData), //cipherText
    initializationVector, //initializationVector,
  ];
};

function parseThreads(threads, key) {
  return threads.join(`--${key}--`);
}

async function sendThreadToServer(threadData) {
  let response = await fetch("/storeData", {
    method: "POST",
    body: threadData,
  });

  return response.text();
}

async function storeThread(threadData) {
  let key = await generateRandomAESKey();
  let keyString = await keyToString(key);
  let processedThread = parseThreads(threadData, keyString);

  let [cipherTextInBytes, initializationVector] = await encryptData(
    processedThread,
    key
  );
  let cipherTextString = byteArrayToBase64String(cipherTextInBytes);
  let ivString = byteArrayToBase64String(initializationVector);

  const response = await sendThreadToServer(cipherTextString);

  return `${window.location.origin}#data=${response}&k=${keyString}&iv=${ivString}`;
}
////////////
const decryptData = async (encryptedData, key, initializationVector) => {
  const decryptData = await window.crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: initializationVector,
    },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptData);
};

function parseUrl(urlString) {
  const url = new URL(urlString);
  const hashPart = url.hash;

  const params = new URLSearchParams(hashPart.substring(1));

  return [params.get("data"), params.get("k"), params.get("iv")];
}

function urlHasHashTag(urlString) {
  const urlHash = new URL(urlString).hash;

  if (urlHash.length > 0) {
    return true;
  }

  return false;
}
async function decryptThread(
  cipherTextString,
  keyString,
  initializationVector
) {
  const cipherTextInBytes = base64StringToByteArray(cipherTextString);
  const key = await importKeyFromArray(base64StringToByteArray(keyString));
  const iv = base64StringToByteArray(initializationVector);

  const decryptedData = await decryptData(cipherTextInBytes, key, iv);

  const threads = decryptedData.split(`--${keyString}--`);

  return threads;
}

async function getThreadDataFromServer(url) {
  let response = await fetch(url);

  return response.text();
}
////
async function main() {
  const createThread = document.getElementById("createThread");
  const threadContainer = document.getElementById("threadContainer");
  const shareThread = document.getElementById("shareThread");
  const threadTitle = document.getElementById("titleText")
  createThread.addEventListener("click", () => {
    let div = document.createElement("div");
    let textArea = document.createElement("textarea");
    textArea.className = "threadContent";
    textArea.cols = "30";
    textArea.rows = "3";
    textArea.style = "width: 90%; resize: none; border: 2px solid black";
    div.appendChild(textArea);
    div.className = "threadChild";
    div.style = "margin-top: 30px";
    threadContainer.appendChild(div);
  });

  shareThread.addEventListener("click", async () => {
    const linkBox = document.getElementById("linkBox");
    const threadContents = document.querySelectorAll(".threadContent");
    let textContent = [];

    textContent.push(threadTitle.value)
    threadContents.forEach((element) => {
      textContent.push(element.value);
    });

    let linkToThread = await storeThread(textContent);

    linkBox.classList.remove("hidden");
    linkBox.innerText = linkToThread;

  });

  if (urlHasHashTag(window.location.href)) {
    console.log("IN DECRYPT MODE");
    let [dataMd5, keyString, initializationVector] = parseUrl(
      window.location.href
    );

    let dataFromServer = await getThreadDataFromServer(
      window.location.origin + "/" + dataMd5
    );

    let threadObtained = await decryptThread(
      dataFromServer,
      keyString,
      initializationVector
    );
    
    threadTitle.value = threadObtained[0]
    threadObtained.slice(1).forEach(element => {
      let div = document.createElement("div");
      let textArea = document.createElement("textarea");
      textArea.className = "threadContent";
      textArea.cols = "30";
      textArea.rows = "3";
      textArea.style = "width: 90%; resize: none; border: 2px solid black";
      textArea.value = element.toString()
      div.appendChild(textArea);
      div.className = "threadChild";
      div.style = "margin-top: 30px";
      threadContainer.appendChild(div);
    })
  }
}

main();
