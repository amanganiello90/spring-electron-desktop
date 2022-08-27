const { app, ipcMain, dialog, BrowserWindow, Menu } = require('electron')
const { autoUpdater } = require('electron-updater');
const url = require('url');
const path = require('path');

///// for java process
const { nextAvailable } = require('node-port-check');
const child = require("child_process").spawn;
let javaProcess;
let mainWindow;

function strip(s) {
    // regex from: http://stackoverflow.com/a/29497680/170217
    return s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function sendServerOutToWin(log, eventName) {
    let lineBuffer = "";
    log.on('data', function(data) {
        lineBuffer += data.toString();
        let lines = lineBuffer.split("\n");
        lines.forEach(l => {
            if (l !== "") {
                mainWindow.webContents.send(eventName, strip(l));
            }
        });
        lineBuffer = lines[lines.length - 1];
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
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {});
    mainWindow.webContents.on('did-start-loading', (e) => {
       if(javaProcess) {
        javaProcess.kill('SIGINT');
       }
      });
}


app.on('ready', () => {
    Menu.setApplicationMenu(menu);
    createWindow();
    // get available port from 8080
    ipcMain.on('server-host-event', (event, args) => {
        nextAvailable(8080, '0.0.0.0').then((nextAvailablePort) => {
            javaProcess = child("java", ["-jar", __dirname + "/app.jar", "--server.port=" + nextAvailablePort], {
                cwd: process.cwd()
            });

            sendServerOutToWin(javaProcess.stdout, 'server-log-event');
            sendServerOutToWin(javaProcess.stderr, 'server-error-event');
            event.returnValue = "http://localhost:" + nextAvailablePort;

        });
    })

});

app.on('window-all-closed', function() {
    javaProcess.kill('SIGINT');
    app.quit();
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow();
    }
});