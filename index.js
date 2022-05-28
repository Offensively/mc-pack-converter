async function main() {
    const fs = require('fs');
    const cliProgress = require('cli-progress');
    
    const utils = require('./utils');
    
    const help = "Minecraft Texture Pack Converter Help\n\t-i - The input zip file path\n\t-o - The output zip file path\n\t-v - The version to switch to";
    
    if (!process.argv.includes("-i") || !process.argv.includes("-o") || !process.argv.includes("-v") || process.argv.includes("-h") && process.argv.includes("--help")) {
        console.log(help);
        return;
    }
    
    const input = process.argv[process.argv.indexOf('-i') + 1];
    const tempFile = __dirname + "/temp/" + input.split("/")[input.split("/").length - 1];
    const tempFolder = tempFile.slice(0, -4);
    const packName = tempFile.replace(__dirname + "/temp/", "").slice(0, -4);
    const output = process.argv[process.argv.indexOf('-o') + 1];
    const version = process.argv[process.argv.indexOf('-v') + 1];
    
    if (!fs.existsSync(input) || !input.endsWith('.zip')) {
        console.log("Invalid path: " + input);
        return;
    }
    if (!output.endsWith('.zip')) {
        console.log("Invalid path: " + output);
        return;
    }
    if (!utils.isValidVersion(version)) {
        console.log("Invalid verion: " + version);
        return;
    }
    
    if (!fs.existsSync(__dirname + "/temp")) {
        fs.mkdirSync(__dirname + "/temp");
    }
    
    const progress = new cliProgress.SingleBar({
        format: 'Converting |{bar}| {percentage}%',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    process.on('uncaughtException', (err) => {
        progress.stop();
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine(1);
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        fs.rmSync(tempFolder, { recursive: true, force: true });
        if (err.name.includes('directory not empty, rename')) {
            main();
            return;
        }
        console.log(err)
        process.exit(1);
    })
    
    progress.start(11, 0, {
        speed: "N/A"
    });
    
    // Copy
    fs.copyFileSync(input, tempFile);
    progress.increment();

    // Unzip
    await utils.unzip(tempFile, tempFolder);
    const files = fs.readdirSync(tempFolder);
    if (files.length == 0) {
        progress.stop();
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine(1);
        console.log("Invalid pack.");
        fs.unlinkSync(tempFile);
        fs.rmSync(tempFolder, { recursive: true, force: true });
        return;
    }
    if (!files.includes('pack.mcmeta') && files.length == 1) {
        const folderName = files[0];
        fs.renameSync(tempFolder+"/"+folderName, tempFolder+"Temp")
        fs.rmdirSync(tempFolder)
        fs.renameSync(tempFolder+"Temp", tempFolder)
    }
    progress.increment();

    // Remove old zip
    fs.rmSync(tempFile);
    progress.increment();

    // Change pack.mcmeta
    let packMcmetaRaw = fs.readFileSync(tempFolder+"/pack.mcmeta");
    let packMcmetaJson = JSON.parse(packMcmetaRaw);
    packMcmetaJson.pack.pack_format = parseInt(utils.versionToMcmeta(version));
    fs.writeFileSync(tempFolder+"/pack.mcmeta", JSON.stringify(packMcmetaJson));
    progress.increment();

    // Change to lang or JSON
    if (fs.existsSync(tempFolder+"/assets/minecraft/lang")) {
        let allLangFiles;
        switch (version) {
            case "1.8":
            case "1.9":
            case "1.10":
            case "1.11":
            case "1.12":
                allLangFiles = fs.readdirSync(tempFolder+"/assets/minecraft/lang");
                for (var i = 0; i < allLangFiles.length; i++) {
                    const fileName = allLangFiles[i];
                    if (fileName.endsWith(".json") && !fs.existsSync(tempFolder+"/assets/minecraft/lang/"+fileName.slice(0, -5)+".lang")) {
                        const raw = fs.readFileSync(tempFolder+"/assets/minecraft/lang/"+fileName);
                        const json = JSON.parse(raw);
                        const convertedRaw = utils.jsonToLang(json);
                        fs.writeFileSync(tempFolder+"/assets/minecraft/lang/"+fileName.slice(0, -5)+".lang", convertedRaw);
                    }
                }
            case "1.13":
            case "1.14":
            case "1.15":
            case "1.16":
            case "1.17":
            case "1.18":
                allLangFiles = fs.readdirSync(tempFolder+"/assets/minecraft/lang");
                for (var i = 0; i < allLangFiles.length; i++) {
                    const fileName = allLangFiles[i];
                    if (fileName.endsWith(".lang") && !fs.existsSync(tempFolder+"/assets/minecraft/lang/"+fileName.slice(0, -5)+".json")) {
                        const raw = fs.readFileSync(tempFolder+"/assets/minecraft/lang/"+fileName);
                        const lang = raw.toString();
                        const convertedRaw = utils.langToJson(lang);
                        fs.writeFileSync(tempFolder+"/assets/minecraft/lang/"+fileName.slice(0, -5)+".json", JSON.stringify(convertedRaw, null, 4));
                    }
                }
        }
    }
    progress.increment();

    // Villager Skins
    // TODO: Overlay 1.13 - 1.18 villager overlays on main vilager image for 1.8 - 1.12
    const villager = tempFolder+'/assets/minecraft/textures/entity/villager/villager.png';
    switch (version) {
        case "1.8":
        case "1.9":
        case "1.10":
        case "1.11":
        case "1.12":
            if (fs.existsSync(villager)) {
                fs.copyFileSync(villager, tempFolder+'/assets/minecraft/textures/entity/villager/farmer.png')
                fs.copyFileSync(villager, tempFolder+'/assets/minecraft/textures/entity/villager/librarian.png')
                fs.copyFileSync(villager, tempFolder+'/assets/minecraft/textures/entity/villager/priest.png')
                fs.copyFileSync(villager, tempFolder+'/assets/minecraft/textures/entity/villager/butcher.png')
                fs.copyFileSync(villager, tempFolder+'/assets/minecraft/textures/entity/villager/smith.png')
            }
        case "1.13":
        case "1.14":
        case "1.15":
        case "1.16":
        case "1.17":
        case "1.18":
            if (!fs.existsSync(villager)) {
                fs.copyFileSync(tempFolder+'/assets/minecraft/textures/entity/villager/farmer.png', villager)
            }
    }
    progress.increment();

    // Change based on version
    switch (version) {
        case "1.8":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.9":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.10":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.11":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.12":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.13":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.14":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.15":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.16":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item", tempFolder+"/assets/minecraft/textures/items")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items/wooden_sword.png", tempFolder+"/assets/minecraft/textures/items/wood_sword.png")
            }
            break;
        case "1.17":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items", tempFolder+"/assets/minecraft/textures/item")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item/wood_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item/wood_sword.png", tempFolder+"/assets/minecraft/textures/item/wooden_sword.png")
            }
            break;
        case "1.18":
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/items")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/items", tempFolder+"/assets/minecraft/textures/item")
            }
            if (fs.existsSync(tempFolder+"/assets/minecraft/textures/item/wood_sword.png")) {
                fs.renameSync(tempFolder+"/assets/minecraft/textures/item/wood_sword.png", tempFolder+"/assets/minecraft/textures/item/wooden_sword.png")
            }
            break;
    }
    progress.increment();

    // Zip final product
    await utils.zip(tempFolder, tempFile);
    progress.increment();

    // Delete folder
    fs.rmSync(tempFolder, { recursive: true, force: true });
    progress.increment();

    // Copy file to output
    fs.copyFileSync(tempFile, output)
    progress.increment();

    // Delete temp zip
    fs.unlinkSync(tempFile)
    progress.increment();

    progress.stop();
}

main()