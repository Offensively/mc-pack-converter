const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const _ = require('lodash');
const crypto = require('crypto');
const main = require('./index');

const app = express();

let finishedConverting = [];
let errorConverting = {};

// Enable file uploads
app.use(fileUpload({
    createParentPath: true
}));

// Add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname+'/site'))

// Add routes
app.post('/upload-pack', async (req, res) => {
    try {
        if (!req.files) {
            res.redirect('./?error='+encodeURIComponent('No file uploaded!'));
        } else {
            let pack = req.files.pack;

            if (!fs.existsSync(__dirname+'/site/uploads')) {
                fs.mkdirSync(__dirname+'/site/uploads');
            }
            
            // 60000000 bytes == 60 megabytes
            if (pack.mimetype == "application/zip" && pack.size < 60000000) {
                const packUuid = crypto.randomUUID() + '.zip';
                await pack.mv('./site/uploads/' + packUuid);

                main.convertPack(__dirname+'/site/uploads/' + packUuid, __dirname+'/site/uploads/' + packUuid, req.body.version, false)
                    .then( (result) => {
                        if (result.success) {
                            finishedConverting.push(packUuid);
                        } else {
                            errorConverting[packUuid] = result.reason;
                        }
                    })
    
                res.redirect('./converting.html?packName='+packUuid)
            } else {
                if (pack.mimetype != "application/zip") {
                    res.redirect('./?error='+encodeURIComponent('Not a zip file!'));
                } else if (pack.size <! 6000000) {
                    res.redirect('./?error='+encodeURIComponent('Filesize too big!'));
                }
            }
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(err);
    }
});

app.get('/check-conversion', (req, res) => {
    const packName = req.query.packName;
    if (finishedConverting.includes(packName)) {
        finishedConverting.splice(finishedConverting.indexOf(packName));
        res.redirect('./done.html?packName='+packName);
    } else if (Object.keys(errorConverting).includes(packName)) {
        if (errorConverting[packName] == "Not a resource pack!") {
            res.redirect('./?error='+encodeURIComponent('Not a resource pack!'));
        } else {
            res.redirect('./error.html');
        }
        delete errorConverting[packName];
    } else {
        res.redirect('./converting.html?packName='+packName);
    }
})

// Start server 
const port = process.env.PORT || 8081;

app.listen(port, () => 
  console.log(`Pack Converter is listening on port ${port}.`)
);

const findRemoveSync = require('find-remove');
setInterval(findRemoveSync.bind(this, __dirname + '/site/uploads', {age: {seconds: 900}}), 300000)