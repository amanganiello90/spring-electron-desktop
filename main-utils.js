const child = require("child_process").spawn;


function strip(s) {
    // regex from: http://stackoverflow.com/a/29497680/170217
    return s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function checkJava(callback) {
    var spawn = child('java', ['-version']);
    spawn.on('error', err => {
        return callback(err);
    })
}

function killEventualJavaProcess (javaProcess) {
    if(javaProcess){
        javaProcess.kill('SIGINT');
    }

}

module.exports = {
    strip,
    checkJava,
    killEventualJavaProcess
}
