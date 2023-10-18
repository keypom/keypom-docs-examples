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
const KEYPOM_CONTRACT = "ncon23.keypom.testnet"
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
    const keyPair = KeyPair.fromString("UbLzssMN5QdQurKm7TGsKnRRGU819BRvWqC2Ehm1TC6LGN9kLr5Zu5RoSm42G57kUK3pLZJJfZg6NEqmFhMKvxx");
    myKeyStore.setKey(NETWORK_ID, KEYPOM_CONTRACT, keyPair)
    const NEW_ACCOUNT_ID = "moon.ncon-factory.keypom.testnet";
    
    let numKeys = 1
    const newKeypair = await generateKeys({numKeys})
    const TERA_GAS = 1000000000000;
    // Get required gas
    let requiredGas = (63.4*TERA_GAS).toString()
    try{
        let keyInfo = await fundingAccount.viewFunction({
            contractId: KEYPOM_CONTRACT,
            methodName: "get_key_information",
            args:{
                key: keyPair.publicKey.toString()
            }
        })

        requiredGas = keyInfo.required_gas
    }catch(e){
        
    }
    try{
        await fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "create_account_and_claim",
            args: {
                // New account ID from user input
                new_account_id: NEW_ACCOUNT_ID,
                new_public_key: newKeypair.publicKeys[0],
                fc_args: [],
            },
            gas: requiredGas,
        })

        await writeFile(path.resolve(__dirname, 'new_account_keypair.json'), `${newKeypair.publicKeys[0]}, ${newKeypair.secretKeys[0]}`);
    }catch(e){
        console.log(e)
        console.log("claim failed")
    }
}


main()



module.exports = {
    main,
}
