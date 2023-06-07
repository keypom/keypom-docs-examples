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
    hashPassword,
    canUserAddKeys,
    addToSaleAllowlist,
    removeFromSaleAllowlist
} = keypom




async function openSaleTest(fundingAccount) {
    const TICKET_PRICE = "1"

    // Create drop with a maximum of 100 keys that can be added by anyone
    const { keys, dropId } = await createDrop({
        account: fundingAccount,
        depositPerUseNEAR: 0.1,
        config: {
            sale: {
                maxNumKeys: 10,
                pricePerKeyNEAR: TICKET_PRICE
            }
        }
    });

    console.log("Checking drop starting key supply, should be 0")
    let startingNumKeys = await getKeySupplyForDrop({dropId})
    assert(startingNumKeys == 0, "Drop should start with 0 keys")

    console.log("Checking permissions")
    let canAddKeys = await canUserAddKeys({dropId, accountId: "minqianlu.testnet"});
    assert(canAddKeys, "Not everyone is allowed to add keys")

    console.log("Buying Key")
    const {publicKeys} = await generateKeys({numKeys: 1});
    await addKeys({account: fundingAccount, publicKeys, dropId, extraDepositNEAR: TICKET_PRICE})

    console.log("Checking drop keys again")
    let newgNumKeys = await getKeySupplyForDrop({dropId})
    assert(newgNumKeys == 1, "Drop should now have 1 key added by minqianlu")
}

async function AllowlistTests(fundingAccount) {
    // Create drop with restrictive allowlist, try adding with another account, then modify allowlist and check permissions
    // check with canUserAddKeys

    const { keys, dropId } = await createDrop({
        account: fundingAccount,
        depositPerUseNEAR: 0.1,
        config: {
            sale: {
                maxNumKeys: 10,
                pricePerKeyNEAR: 1,
                allowlist: ["minqi.testnet"]
            }
        }
    });

    // check benji perms
    console.log("Checking benji perms")
    let canAddKeys = await canUserAddKeys({dropId, accountId: "benji.testnet"});
    assert(!canAddKeys, "benji shouldn't be allowed")

    console.log("add benji")
    await addToSaleAllowlist({account: fundingAccount, dropId, accountIds: ["benji.testnet"]});
    canAddKeys = await canUserAddKeys({dropId, accountId: "benji.testnet"});
    assert(canAddKeys, "benji still cannot add keys")

    console.log("remove minqi")
    await removeFromSaleAllowlist({account: fundingAccount, dropId, accountIds: ["minqi.testnet"]});
    let canAddKeys2 = await canUserAddKeys({dropId, accountId: "mini.testnet"});
    assert(!canAddKeys2, "minqi is still allowed to add")
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

    // await openSaleTest(fundingAccount)
    await AllowlistTests(fundingAccount)
    // await recurringPaymentTest(fundingAccount)
}


tests()

