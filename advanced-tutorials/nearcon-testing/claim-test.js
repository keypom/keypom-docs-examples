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
const KEYPOM_CONTRACT = "testing-nearcon-keypom.testnet"
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
    const keyPair = KeyPair.fromString("w9acLN98k6VC5iQTepUKGz6NjHd64U9xZ4VjMQ2TWFqF2doRrwHGKXxzrpC8759DSLFyGznraVGeCVobbaMMA5K");
    myKeyStore.setKey(NETWORK_ID, KEYPOM_CONTRACT, keyPair)

    let basePassword = "nearcon23-password"
    console.log(keyPair.publicKey.toString())
    let passwordForClaim = await generatePasswordForClaim(keyPair.publicKey.toString(), 1, basePassword)
    
    const TERA_GAS = 1000000000000;
    try{
        await fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "claim",
            args: {
                account_id: KEYPOM_CONTRACT,
                fc_args: [],
                // password: hash("banana")
                password: passwordForClaim
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
