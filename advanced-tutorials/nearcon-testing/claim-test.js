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
    const keyPair = KeyPair.fromString("4QLVidgJgChcmb2prLRyuFkjq3kzbjCv4ywT2bPMHXz71TwmZpuweMubfDTzYrZdX1FYEVLC2LEsw3Q3uQgpTc2u");
    myKeyStore.setKey(NETWORK_ID, KEYPOM_CONTRACT, keyPair)

    let basePassword = "nearcon23-password"
    console.log(keyPair.publicKey.toString())
    let passwordForClaim = await generateClaimPassword({
        basePassword,
        publickKey: keyPair.publicKey.toString(),
        //publickKey: "ed25519:Dz5eUMjVWDNh9e6wf5RBgHpxKvmxfD3aqnGfPj6fHbUP",
        use: 1
    })
    
    //let passwordForClaim1 = await hashPassword("nearcon23-passworded25519:Gms5A1dXjRvKB8JsFfMm7YbgeXVAtwzTaXhgavZ1fn21")
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

async function generateClaimPassword({basePassword, publickKey, use}) {
    let unhashed_pw = `${basePassword}${publickKey}${use.toString()}`
    console.log(unhashed_pw)
    // return createHash("sha256").update(Buffer.from(unhashed_pw)).digest("hex");
    return await hashPassword(unhashed_pw)
}

async function hash(string) {
    //return createHash("sha256").update(Buffer.from(string)).digest("hex");
    return await hashPassword(string)
}


main()



module.exports = {
    main,
}
