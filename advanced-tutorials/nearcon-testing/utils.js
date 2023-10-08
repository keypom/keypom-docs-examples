const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");
const { createHash } = require("crypto");
const { readFileSync } = require('fs');
const { writeFile, mkdir, readFile } = require('fs/promises');

const keypom = require("@keypom/core");
const { DAO_CONTRACT, DAO_BOT_CONTRACT, DAO_BOT_CONTRACT_MAINNET, DAO_CONTRACT_MAINNET } = require("./configurations");
//const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const KEYPOM_CONTRACT = "testing-nearcon-keypom.testnet"
const DROP_ID = "nearcon-2023"
const {
    initKeypom,
    getEnv,
    createDrop,
    formatLinkdropUrl,
    generateKeys,
    hashPassword
} = keypom


function hash(string) {
    return createHash("sha256").update(Buffer.from(string)).digest("hex");
    //return await hashPassword(string)
}

async function sdkHash(string) {
    //return createHash("sha256").update(Buffer.from(string)).digest("hex");
    return await hashPassword(string)
}
  

// example: usesWithPassword = [1, 3]
async function generatePasswordsForKey(pubKey, usesWithPassword, basePassword, sdk=false) {
    let passwords = {};
    if(!sdk){
        // Loop through usesWithPassword
        for (var use of usesWithPassword) {
          let pw = basePassword + pubKey + use.toString()
          console.log('pw before double hash: ', pw)
          let firstHash = hash(pw)
          passwords[use] = hash(firstHash);
        }
    }
    else{
        // Loop through usesWithPassword
        for (var use of usesWithPassword) {
            let pw = basePassword + pubKey + use.toString()
            console.log('pw before double hash: ', pw)
            let firstHash = await sdkHash(pw)
            passwords[use] = await sdkHash(firstHash);
          }
    }
    console.log(`pw after double hash: ${passwords[use]}`)
    return passwords;
}

// example: usesWithPassword = [1, 3]
async function generatePasswordForClaim(pubKey, use, basePassword, sdk=false) {
    let password = "";
    if(!sdk){
        let pw = basePassword + pubKey + use.toString()
        console.log('pw for claim before hash: ', pw)
        password = hash(pw);
        console.log(`single hashed claim pw: ${password}`)
        console.log(`double hashed claim pw: ${hash(password)}`)
    }
    else{
        let pw = basePassword + pubKey + use.toString()
        console.log('pw for claim before hash: ', pw)
        password = await sdkHash(pw);
        let doubleHashedPw = await sdkHash(password)
        console.log(`single hashed claim pw: ${password}`)
        console.log(`double hashed claim pw: ${doubleHashedPw}`)
    }

    return password;
}



module.exports = {
    hash,
    generatePasswordsForKey,
    generatePasswordForClaim,
    sdkHash
}
