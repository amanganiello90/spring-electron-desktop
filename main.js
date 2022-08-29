const { app, ipcMain, dialog, BrowserWindow, Menu } = require('electron')
const { autoUpdater } = require('electron-updater');
const url = require('url');
const path = require('path');
const fs = require('fs');

let mainWindow;

///// for java process
const { nextAvailable } = require('node-port-check');
const child = require("child_process").spawn;
const utils = require('./main-utils');
let javaProcess;
let stringLogFile='';


function createLog(log) {
    let lineBuffer = "";
    log.on('data', function(data) {
        lineBuffer += data.toString();
        let lines = lineBuffer.split("\n");
        lines.forEach(l => {
            if (l !== "") {
                stringLogFile=stringLogFile.concat(utils.strip(l)+'\n');
            }
        });
        lineBuffer = lines[lines.length - 1];
    });
}


function saveLogServer () {
    dialog.showSaveDialog({
        title: 'Seleziona la cartella dove salvare',
        defaultPath: require('os').homedir(),
        buttonLabel: 'Salva',
        // choose only text files
        filters: [
            {
                name: 'File di testo',
                extensions: ['txt']
            }, ],
        properties: []
    }).then(file => {
        // check if canceled operation
        if (!file.canceled) {
              
            // create and write file
            fs.writeFile(file.filePath.toString(), 
            stringLogFile, function (err) {
                if (err) {
                    dialog.showMessageBox({
                        message: 'Errore nel salvataggio log',
                        details: err.message,
                        type: 'error'
                    });
                } else {
                    dialog.showMessageBox({
                        message: 'Log salvato con successo',
                        type: 'info'
                    });
                }
           
            });
        }
    });

}
/////



if (require('electron-squirrel-startup')) return;

const template = [
    {
        label: 'Info',
        submenu: [{
                label: 'Versione',
                click() {
                    dialog.showMessageBox({
                        message: 'Programma esempio spring electron console versione ' + app.getVersion(),
                        type: 'info'
                    });
                }
            },
            {
                label: 'Aggiorna',
                click() {
                    autoUpdater.checkForUpdates();
                    autoUpdater.on('update-not-available', () => {
                        dialog.showMessageBox({
                            message: 'Non ci sono aggiornamenti disponibili',
                            type: 'info'
                        });
                    });
                    autoUpdater.on('update-downloaded', () => {
                        const updateOptions = {
                            type: 'question',
                            buttons: ['Si', 'No (ma sarà installato al prossimo riavvio)'],
                            defaultId: 0,
                            title: 'Aggiornamento disponibile',
                            message: 'Aggiornamento trovato e scaricato. Riavviare il programma per installarlo?',
                        };
                        var idButton = dialog.showMessageBoxSync(null, updateOptions);
                        if (idButton == 0) {
                            autoUpdater.quitAndInstall();
                        }
                    });
                }
            }
        ],
    }
];

if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
        label: name
    });
}

const menu = Menu.buildFromTemplate(template);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 500,
        fullscreen: false,
        resizable: false,
        sandbox: false,
        icon: path.join(__dirname, 'icons', 'example.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        },
    });
    mainWindow.webContents.session.clearCache();
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {});
    mainWindow.webContents.on('did-start-loading', () => {
        utils.killEventualJavaProcess(javaProcess);
      });
}


app.on('ready', () => {

    utils.checkJava(err =>{
        if(err) {
            dialog.showMessageBox({
                title: 'Errore Java',
                message: 'Impossibile rilevare java',
                details: 'Installare una valida versione',
                type: 'error'
            });
            utils.killEventualJavaProcess(javaProcess);
            app.exit();
        }
    });

    Menu.setApplicationMenu(menu);
    createWindow();
    // get available port from 8080
    ipcMain.on('server-host-event', (event, args) => {
        nextAvailable(8080, '0.0.0.0').then((nextAvailablePort) => {
            javaProcess = child("java", ["-jar", __dirname + "/app.jar", "--server.port=" + nextAvailablePort], {
                cwd: process.cwd()
            }).on('error', err => {
                dialog.showMessageBox({
                    message: 'Errore avvio processo java',
                    details: err.message,
                    type: 'error'
                });
                app.exit();
            })
            createLog(javaProcess.stdout);
            createLog(javaProcess.stderr);
            event.returnValue = "http://localhost:" + nextAvailablePort;

        });
    })


    ipcMain.on('timeout-event', (event, args) => {
        dialog.showMessageBox({
            message: 'Tempo di caricamento troppo lungo',
            detail: 'Possibile errore: visiona il log dal tasto apposito',
            type: 'warning'
        });
        event.returnValue = 'null';
    });

    ipcMain.on('download-log-event', (event, args) => {
        saveLogServer();
        event.returnValue = 'null';
    });

    ipcMain.on('restart-event', (event, args) => {
        mainWindow.reload();
        event.returnValue = 'null';
    });
});

app.on('window-all-closed', function() {
    utils.killEventualJavaProcess(javaProcess);
    app.quit();
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow();
    }
});