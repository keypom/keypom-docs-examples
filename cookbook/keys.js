// Initiate connection to the NEAR blockchain.
const path = require("path");
var assert = require('assert');
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");
const keypom = require("@keypom/core");
const { BN } = require("bn.js");
const { readFileSync } = require('fs');

const {
    initKeypom,
    createDrop,
    getDropInformation,
    generateKeys,
    addKeys,
    getKeyInformation,
    getKeySupplyForDrop,
    claim,
    createNFTSeries,
    createTrialAccountDrop,
    claimTrialAccountDrop,
    trialSignAndSendTxns,
    deleteKeys,
    getKeysForDrop
} = keypom




async function keyTests(fundingAccount) {
    // Creating drop with 2 single use keys
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 2,
        config:{
            usesPerKey: 3
        },
        depositPerUseNEAR: "0.1",
    });

    // Delete first key from drop
    await deleteKeys({
        account: fundingAccount,
        dropId,
        publicKeys: keys.publicKeys[0] // Can be wrapped in an array as well
    })

    // Query for the key supply for a drop
    const keySupply = await getKeySupplyForDrop({
        dropId
    })

    assert(keySupply == 1, "Key deletion unsuccessful")

    // Query for the key supply for the drop that was created
    const keyInfos = await getKeysForDrop({
        dropId
    })

    // Check key usage of first key
    const keyUsage = keyInfos[0].remaining_uses
    assert(keyUsage == 3, "Getting key usage has failed")

    // Check key usage of first key
    const keyBalance = keyInfos[0].allowance
    console.log(`Key balance is: ${keyBalance}`)
    assert(keyBalance != 0, "Key balance funky")



    

}

async function tests() {
    const network = "testnet"
    const CREDENTIALS_DIR = ".near-credentials";
    const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);
    const YOUR_ACCOUNT = "minqi.testnet";

    let keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);

    let nearConfig = {
        networkId: network,
        keyStore: keyStore,
        nodeUrl: `https://rpc.${network}.near.org`,
        walletUrl: `https://wallet.${network}.near.org`,
        helperUrl: `https://helper.${network}.near.org`,
        explorerUrl: `https://explorer.${network}.near.org`,
    };  

    let near = new Near(nearConfig);
    const fundingAccount = await near.account(YOUR_ACCOUNT);

    // If a NEAR connection is not passed in and is not already running, initKeypom will create a new connection
    // Here we are connecting to the testnet network
    await initKeypom({
        near,
        network
    });

    await keyTests(fundingAccount)

}


tests()

