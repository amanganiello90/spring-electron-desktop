const { ipcRenderer} = require('electron');
const request = require('request');
window.$ = window.jQuery = require('./node_modules/jquery/dist/jquery.min.js');

const jarAppUrl = ipcRenderer.sendSync('server-host-event', '');
let timeout =35 // timeout in seconds to show possible error during loading


$serverLog = $("#serverLog");
$jarApp = $("#jarAppId"),
$loading = $("#loading");

$serverLog.append("*********INIT LOG SERVER*********<br/>***********************************<br/>");

ipcRenderer.on('change-win-event', () => {
  if ($serverLog.css("display") === "none") {
      $serverLog.css("display", "block");
      $jarApp.addClass("jarAppHide");
  } else {
      $jarApp.removeClass("jarAppHide");
      $serverLog.css("display", "none");
  }
});

ipcRenderer.on('server-log-event', (event,log)  =>{
  $serverLog.append(log + "<br/>");
});



let checkServerRunning = setInterval(() => {
  request(jarAppUrl, (error, response, body) => {
      timeout--;
      if (!error && response.statusCode == 200) {
          $jarApp.attr("src", jarAppUrl);
          $loading.css("display", "none");
          $jarApp.css("display", "block");
          clearInterval(checkServerRunning);
      } else if (timeout===0) {
       ipcRenderer.sendSync('timeout-event', '');
      }
  });
}, 1000);