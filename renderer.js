const { ipcRenderer, shell} = require('electron');
const request = require('request');

const jarAppUrl = ipcRenderer.sendSync('server-host-event', '');
let timeout =35 // timeout in seconds to show possible error during loading

let $infoPanel=document.getElementById('infoPanel');
let javaUrlFromRenderer;


let checkServerRunning = setInterval(() => {
  request(jarAppUrl, (error, response, body) => {
      timeout--;
      if (!error && response.statusCode == 200) {
        javaUrlFromRenderer=jarAppUrl;
        $infoPanel.innerHTML=$infoPanel.innerHTML.concat(`<span style='color: blue'>App avviata su indirizzo browser: ${jarAppUrl}</span></br>`);
        shell.openExternal(jarAppUrl);
        clearInterval(checkServerRunning);
        checkAfterRunning();
      } else if (timeout===0) {
        $infoPanel.innerHTML=$infoPanel.innerHTML.concat("<span style='color: red'>Possibile errore. Riavvia o visualizza log</span></br>");
        ipcRenderer.sendSync('timeout-event', '');
      }
  });
}, 1000);

// check after if the server go down
function checkAfterRunning() {
let checkServerAfterRun = setInterval(() => {
  request(javaUrlFromRenderer, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        javaUrlFromRenderer=null;
        $infoPanel.innerHTML=$infoPanel.innerHTML.concat(`<span style='color: red'>App non più disponibile. Riavvia</span></br>`);
        clearInterval(checkServerAfterRun);
      }
  });
}, 15000);

}


/// javascript on click functions

function restart() {
  ipcRenderer.sendSync('restart-event', '');
}

function downloadLog() {
  ipcRenderer.sendSync('download-log-event', '');
}

function openBrowser() {
  if(javaUrlFromRenderer) {
    shell.openExternal(javaUrlFromRenderer);
  }
}

module.exports = {
restart, downloadLog, openBrowser
}