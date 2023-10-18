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
const { KeyPair } = require("@near-js/crypto");
//const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const KEYPOM_CONTRACT = "testing-nearcon-keypom.testnet"
const DROP_ID = "nearcon-2023"
const {
    initKeypom,
    getEnv,
    createDrop,
    formatLinkdropUrl,
    generateKeys,
    hashPassword,
    getPubFromSecret
} = keypom

async function main(){

    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "minqi.testnet";
    const NETWORK_ID = "testnet";

    // Initiate connection to the NEAR blockchain.
    const CREDENTIALS_DIR = ".near-credentials";
    const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);

    let keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);  

    let nearConfig = {
        networkId: NETWORK_ID,
        keyStore: keyStore,
        nodeUrl: `https://rpc.${NETWORK_ID}.near.org`,
        walletUrl: `https://wallet.${NETWORK_ID}.near.org`,
        helperUrl: `https://helper.${NETWORK_ID}.near.org`,
        explorerUrl: `https://explorer.${NETWORK_ID}.near.org`,
    };  

    let near = new Near(nearConfig);
    const fundingAccount = new Account(near.connection, FUNDER_ACCOUNT_ID)
    await initKeypom({
        near,
        network: NETWORK_ID,
    });

    const keyPair = KeyPair.fromString("ed25519:UbLzssMN5QdQurKm7TGsKnRRGU819BRvWqC2Ehm1TC6LGN9kLr5Zu5RoSm42G57kUK3pLZJJfZg6NEqmFhMKvxx")
    console.log(keyPair.publicKey.toString())

    let keyInfo = await fundingAccount.viewFunction({
        contractId: "ncon23.keypom.testnet",
        methodName: "get_key_information",
        args: {
            key: keyPair.publicKey.toString()
        }
    })
    console.log(keyInfo)
    
}


main()



module.exports = {
    main,
}
