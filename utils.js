module.exports.isValidVersion = (version) => {
    return /1\.[7-9]|1\.1[0-8]/g.test(version);
}

const fs = require('fs');
const unzipper = require('unzipper');

module.exports.unzip = async (input, output) => {
    return new Promise( (resolve, reject) => {
        fs.createReadStream(input)
            .pipe(unzipper.Extract({ path: output }))
            .once('close', () => {
                resolve();
            });
    })
}

const archiver = require('archiver');

module.exports.zip = (sourceDir, outPath) => {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(outPath);
  
    return new Promise((resolve, reject) => {
      archive
        .directory(sourceDir, false)
        .on('error', err => reject(err))
        .pipe(stream)
      ;
  
      stream.on('close', () => resolve());
      archive.finalize();
    });
  }

module.exports.versionToMcmeta = (version) => {
    switch (version) {
        case "1.7":
        case "1.8":
            return "1";
        case "1.9":
        case "1.10":
            return "2";
        case "1.11":
        case "1.12":
            return "3";
        case "1.13":
        case "1.14":
            return "4";
        case "1.15":
            return "5";
        case "1.16":
            return "6";
        case "1.17":
            return "7";
        case "1.18":
            return "8";
        case "1.19":
            return "9";
        default:
            return "1";
    }
}

module.exports.jsonToLang = (json) => {
    let res = "";
    for (var i = 0; i < Object.keys(json).length; i++) {
        const key = Object.keys(json)[i];
        const value = json[key];
        res = res + key + "=" + value + "\n";
    }
    return res;
}


module.exports.langToJson = (lang) => {
    let res = {};
    const lines = lang.split('\n');
    for (var i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('=')) {
            const key = line.split('=')[0];
            const value = line.split('=')[1];
            res[key] = value.replace('\r', '');
        }
    }
    return res;
}