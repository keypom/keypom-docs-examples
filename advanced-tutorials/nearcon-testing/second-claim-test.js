const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { InMemoryKeyStore } = require("@near-js/keystores");
const { Account } = require("@near-js/accounts");
const { KeyPair, keyStores } = require("@near-js/crypto");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");
const { createHash } = require("crypto");
const { readFileSync } = require('fs');
const { writeFile, mkdir, readFile } = require('fs/promises');

const keypom = require("@keypom/core");
const { DAO_CONTRACT, DAO_BOT_CONTRACT, DAO_BOT_CONTRACT_MAINNET, DAO_CONTRACT_MAINNET } = require("./configurations");
const { generatePasswordForClaim, generatePasswordsForKey, hash, sdkHash } = require("./utils");
const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const {
    initKeypom,
    getEnv,
    createDrop,
    formatLinkdropUrl,
    generateKeys,
    hashPassword
} = keypom

async function main(){

    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "minqi.testnet";
    const NETWORK_ID = "testnet";

    // Initiate connection to the NEAR blockchain.
    const CREDENTIALS_DIR = ".near-credentials";
    const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);

    let myKeyStore = new InMemoryKeyStore()
    //UnencryptedFileSystemKeyStore(credentialsPath);  

    let nearConfig = {
        networkId: NETWORK_ID,
        keyStore: myKeyStore,
        nodeUrl: `https://rpc.${NETWORK_ID}.near.org`,
        walletUrl: `https://wallet.${NETWORK_ID}.near.org`,
        helperUrl: `https://helper.${NETWORK_ID}.near.org`,
        explorerUrl: `https://explorer.${NETWORK_ID}.near.org`,
    };  

    let near = new Near(nearConfig);
    const fundingAccount = new Account(near.connection, KEYPOM_CONTRACT)
    const keyPair = KeyPair.fromString("2iWKBMvq7ysMuXEJ9JHcszH9BMYgwgQoLYNzogWVDjRovVfz6JfUn7rsLGfP7W47EAUPpFm94mivs5pxm5QJDtF4");
    myKeyStore.setKey(NETWORK_ID, KEYPOM_CONTRACT, keyPair)
    
    let numKeys = 1
    const newKeypair = await generateKeys({numKeys})
    const TERA_GAS = 1000000000000;
    try{
        await fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "create_account_and_claim",
            args: {
                // New account ID from user input
                new_account_id: "m00n.testing-nearcon23.testnet",
                new_public_key: newKeypair.publicKeys[0],
                fc_args: [],
            },
            gas: (120*TERA_GAS).toString(),
        })
    }catch(e){
        console.log(e)
        console.log("claim failed")
    }
}


main()



module.exports = {
    main,
}
