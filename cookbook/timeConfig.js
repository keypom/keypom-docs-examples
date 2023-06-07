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
    hashPassword
} = keypom




async function startEndTest(fundingAccount) {
    const ONE_SECOND_NS = 1e9;

    // Creating timed drop with 1 double use keys
    const {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config:{
            usesPerKey: 2,
            time: {
                // Start time is 30 seconds from now
                start: (Date.now() * 1000000) + ONE_SECOND_NS * 15,
                // End time is 90 seconds from start time
                end: (Date.now() * 1000000) + ONE_SECOND_NS * 45,
            },
        },
        depositPerUseNEAR: "0.1",
    });

    console.log("Violating start time")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let jumpStartInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(jumpStartInfo.remaining_uses == 2, "Start time violated")

    console.log("Respecting start time")
    await new Promise(r => setTimeout(r, 15000));
    console.log("Respected")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let goodStartInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(goodStartInfo.remaining_uses == 1, "Valid claim failed")

    console.log("Violating end time")
    await new Promise(r => setTimeout(r, 30001));
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let lateClaimInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(lateClaimInfo.remaining_uses == 1, "End time violated")
}

async function throttleTest(fundingAccount) {
    const ONE_SECOND_NS = 1e9;

    // Creating timed drop with 1 double use keys
    const {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config:{
            usesPerKey: 2,
            time: {
                // Time between use is 15 seconds
                throttle: ONE_SECOND_NS * 30,
            },
        },
        depositPerUseNEAR: "0.1",
    });

    console.log("First claim")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let firstClaimInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(firstClaimInfo.remaining_uses == 1, "First claim failed")

    console.log("Violating throttle time")
    await new Promise(r => setTimeout(r, 5000));
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let goodStartInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(goodStartInfo.remaining_uses == 1, "Throttle has been disrespected :(")

    console.log("Respecting thottle")
    await new Promise(r => setTimeout(r, 25001));
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let keysLeft = await getKeySupplyForDrop({dropId})
    assert(keysLeft == 0, "Not sure how this would happen ://")
}

async function recurringPaymentTest(fundingAccount) {
    const ONE_SECOND_NS = 1e9;

    // Creating timed drop with 1 double use keys
    const {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config:{
            usesPerKey: 3,
            time: {
                // Start time is now + 1s
                start: (Date.now() * 1000000) + ONE_SECOND_NS * 5,
                // End time is 30 day after start time
                end: (Date.now() * 1000000) + ONE_SECOND_NS * 2592000,
                // Time after start for first use is 30s
                interval: ONE_SECOND_NS * 30,
            },
        },
        depositPerUseNEAR: "0.1",
    });

    console.log("Premature claim")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let firstClaimInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(firstClaimInfo.remaining_uses == 3, "First interval failed")

    console.log("First valid time")
    await new Promise(r => setTimeout(r, 30000));
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let goodStartInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(goodStartInfo.remaining_uses == 2, "Interval start has been disrespected :(")

    console.log("Violating Interval")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let violateIntervalInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(violateIntervalInfo.remaining_uses == 2, "Interval has been disrespected :(")

    console.log("Second and third valid claim")
    await new Promise(r => setTimeout(r, 60000));
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let doubelRespectedInfo = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(doubelRespectedInfo.remaining_uses == 1, "Second claim failed")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let keysLeft = await getKeySupplyForDrop({dropId})
    assert(keysLeft == 0, "Not sure how this would happen ://")
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

    // await startEndTest(fundingAccount)
    // await throttleTest(fundingAccount)
    await recurringPaymentTest(fundingAccount)
}


tests()

