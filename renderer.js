const { ipcRenderer} = require('electron');
const request = require('request');
window.$ = window.jQuery = require('./node_modules/jquery/dist/jquery.min.js');

const jarAppUrl = ipcRenderer.sendSync('server-host-event', '');


$serverLog = $("#serverLog");
$jarApp = $("#jarAppId"),
$loading = $("#loading");

$serverLog.append("*********INIT LOG SERVER*********<br/>***********************************<br/>");

ipcRenderer.on('change-win-event', function(event, log) {
  if ($serverLog.css("display") === "none") {
      $serverLog.css("display", "block");
      $jarApp.addClass("jarAppHide");
  } else {
      $jarApp.removeClass("jarAppHide");
      $serverLog.css("display", "none");
  }
})

ipcRenderer.on('server-log-event', function(event, log) {
  $serverLog.append(log + "<br/>");
})

ipcRenderer.on('server-error-event', function(event, log) {
  $serverLog.append(log + "<br/>");
})


let checkServerRunning = setInterval(() => {
  request(jarAppUrl, (error, response, body) => {
      if (!error && response.statusCode == 200) {
          $jarApp.attr("src", jarAppUrl);
          $loading.css("display", "none");
          $jarApp.css("display", "block");
          clearInterval(checkServerRunning);
      }
  });
}, 1000);