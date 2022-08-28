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


function sendServerOutToWin(log, eventName) {
    let lineBuffer = "";
    log.on('data', function(data) {
        lineBuffer += data.toString();
        let lines = lineBuffer.split("\n");
        lines.forEach(l => {
            if (l !== "") {
                mainWindow.webContents.send(eventName, utils.strip(l));
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
        label: 'Modifica',
        submenu: [{
                label: 'Annulla',
                role: 'undo',
                accelerator: 'CommandOrControl+Z',
            },
            {
                label: 'Rifai',
                accelerator: 'Shift+CommandOrControl+Z',
                role: 'redo',
            },
            {
                type: 'separator'
            },
            {
                label: 'Taglia',
                role: 'cut'
            },
            {
                label: 'Copia',
                accelerator: 'CommandOrControl+C',
                role: 'copy',
            },
            {
                label: 'Incolla',
                accelerator: 'CommandOrControl+V',
                role: 'paste',
            },
            {
                label: 'Seleziona Tutto',
                accelerator: 'CommandOrControl+A',
                role: 'selectall',
            },
        ]
    },
    {
        label: 'Finestra',
        submenu: [
            {
                label: 'Indietro',
                click () {
                    if (mainWindow) {
                        mainWindow.webContents.goBack();
                    }
                }
            },
            {
                label: 'Avanti',
                click () {
                    if (mainWindow) {
                        mainWindow.webContents.goForward();
                    }
                }
            },
            {
                label: 'Ricarica',
                role: 'reload'
            },
            {
                label: 'Cambia vista client/server',
                accelerator: 'CommandOrControl+B',
                click() {
                    if (mainWindow) {
                        mainWindow.webContents.send("change-win-event");
                    }
                }
            },
            {
                label: 'Scarica log server',
                click() { saveLogServer() }
            },
            {
                label: 'Attiva devtools',
                role: 'toggledevtools'
            },
            {
                label: 'Minimizza',
                role: 'minimize'
            },
            {
                label: 'Chiudi',
                role: 'close'
            },
            {
                type: 'separator'
            },
            {
                label: 'Reset zoom',
                role: 'resetzoom'
            },
            {
                label: 'Ingrandisci',
                role: 'zoomin'
            },
            {
                label: 'Diminuisci',
                role: 'zoomout'
            }
        ]
    },
    {
        label: 'Info',
        submenu: [{
                label: 'Versione',
                click() {
                    dialog.showMessageBox({
                        message: 'Programma esempio spring electron desktop versione ' + app.getVersion(),
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
    },
    {
        label: 'Aiuto',
        role: 'help',
        submenu: [{
            label: 'Learn More'
        }]
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
        width: 800,
        height: 600,
        fullscreen: true,
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
            sendServerOutToWin(javaProcess.stdout, 'server-log-event');
            sendServerOutToWin(javaProcess.stderr, 'server-log-event');
            event.returnValue = "http://localhost:" + nextAvailablePort;

        });
    })


    ipcMain.on('timeout-event', (event, args) => {
        dialog.showMessageBox({
            message: 'Tempo di caricamento troppo lungo',
            detail: 'Possibile errore: visiona il log accessibile dal menù finestra',
            type: 'warning'
        });
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