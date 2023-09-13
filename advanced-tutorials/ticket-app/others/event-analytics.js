const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");

const keypom = require("@keypom/core");

const {
	initKeypom,
    getDrops,
    getKeysForDrop,
	getEnv,
	createDrop,
    formatLinkdropUrl,
} = keypom

async function countTickets() {
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
    
    // If a NEAR connection is not passed in and is not already running, initKeypom will create a new connection
    // Here we are connecting to the testnet network
    await initKeypom({
        near,
        network: NETWORK_ID,
    });

    // Use last drop as reference
    const drops = await getDrops({
        accountId: FUNDER_ACCOUNT_ID,
        start: 0,
        limit: 300,
        withKeys: false
    }) 
    let drop = drops[drops.length-1]
    let dropId = drop.drop_id
    let totalTickets = drop.next_key_id
    
    // Counters
    let ticketsScanned = 0
    let unusedTickets = 0
    let fullyUsedTickets = 0

    const keys = await getKeysForDrop({
        dropId
    })

    for(let i = 0; i < keys.length; i++){
        if(keys[i].remaining_uses == 1){
            ticketsScanned++
        }else if(keys[i].remaining_uses == 2){
            unusedTickets++
        }
    }
    // ASSUME EACH DROP HAS 50 KEYS, ANY LESS WILL BE CONSIDERED FULLY SCANNED
    if(keys.length < totalTickets){
        fullyUsedTickets += totalTickets-keys.length
    }
    console.log(`Drop ID ${dropId} Analytics: ${ticketsScanned} scanned, ${fullyUsedTickets} fully used, and ${unusedTickets} unused`)
}

countTickets()

module.exports = {
    countTickets,
}
