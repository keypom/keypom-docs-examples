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
    getDropInformation,
	getEnv,
	createDrop,
    formatLinkdropUrl,
} = keypom

async function countTickets() {
    // Change this to your account ID
    const NETWORK_ID = "mainnet";

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
    
    // If a NEAR connection is not passed in and is not already running, initKeypom will create a new connection
    // Here we are connecting to the testnet network
    await initKeypom({
        near,
        network: NETWORK_ID,
    });

    let dropId = "1692598652102"

    const drop = await getDropInformation({
        dropId,
        withKeys: true
    })

    let totalTickets = drop.next_key_id
    let keys = drop.keys
    
    // Counters
    let ticketsScanned = 0
    let unusedTickets = 0
    let fullyUsedTickets = 0

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
