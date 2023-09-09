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

async function createDaoDrop() {
    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "nearapac.near";
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
    const fundingAccount = new Account(near.connection, FUNDER_ACCOUNT_ID)
    
    // If a NEAR connection is not passed in and is not already running, initKeypom will create a new connection
    // Here we are connecting to the testnet network
    await initKeypom({
        near,
        network: NETWORK_ID,
    });

    const drops = await getDrops({
        accountId: FUNDER_ACCOUNT_ID,
        start: 0,
        limit: 300,
        withKeys: false
    })    

    console.log(drops.length)
    let ticketDrops = []
    for(let i = 0; i < drops.length; i++){
        if(drops[i].fc.methods[0] == null && drops[i].fc.methods[1][0].receiver_id == "nft-v2.keypom.mainnet"){
            ticketDrops.push(drops[i].drop_id)
        }
    }

    let ticketsScanned = 0
    let unusedTickets = 0
    let fullyUsedTickets = 0
    for(let i = 0; i < ticketDrops.length; i++){
        console.log(`Analyzing drop number ${i}: ${ticketDrops[i]}`)
        const keys = await getKeysForDrop({
            dropId: ticketDrops[i]
        })
        console.log(`Drop ${ticketDrops[i]} returned ${keys.length} keys`)
        let localScanned = 0
        let localUnused = 0
        let localFullyUsed = 0
        for(let j = 0; j < keys.length; j++){
            if(keys[j].remaining_uses == 1){
                ticketsScanned++
                localScanned++
            }else if(keys[j].remaining_uses == 2){
                unusedTickets++
                localUnused++
            }
        }
        // ASSUME EACH DROP HAS 50 KEYS, ANY LESS WILL BE CONSIDERED FULLY SCANNED
        if(keys.length < 50){
            localFullyUsed += 50-keys.length
            fullyUsedTickets += 50-keys.length
        }

        console.log(`FOR DROP ID: ${ticketDrops[i]}, ${localScanned} tickets were scanned, ${localFullyUsed} tickets were fully used and  ${localUnused} tickets were unused`)
        console.log(`TOTAL IS NOW: ${ticketsScanned} scanned, ${fullyUsedTickets} fully used, and ${unusedTickets} unused`)
    }

}

createDaoDrop()

module.exports = {
    createDaoDrop,
}
