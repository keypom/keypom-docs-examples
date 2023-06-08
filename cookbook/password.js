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




async function protectedDropTest(fundingAccount) {
    let base_password = "base-password"
    // Creating drop with 2 single use keys
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "0.1",
        basePassword: base_password
    })

    let preClaimSupply = await getKeySupplyForDrop({
        dropId
    })

    // First claim
    const keyInfo1 = await getKeyInformation({
        publicKey: keys.publicKeys[0]
    })
    let passwordForClaim = await hashPassword(base_password + keys.publicKeys[0] + keyInfo1.cur_key_use.toString())
    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
        password: passwordForClaim
    })

    let postClaimSupply = await getKeySupplyForDrop({
        dropId
    })

    assert(preClaimSupply - postClaimSupply === 1, `PW protected drop failed.`)
}

async function protectedUseTest(fundingAccount) {
    let base_password = "base-password"
    // Creating drop with 2 single use keys
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config:{
            usesPerKey: 2
        },
        depositPerUseNEAR: "0.1",
        basePassword: base_password,
        // Password protect the first key uses
        passwordProtectedUses: [1],
    })

    let preBadClaim = await getKeyInformation({publicKey: keys.publicKeys[0]})

    // this should fail
    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
    })

    let postBadClaim = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(preBadClaim.cur_key_use == postBadClaim.cur_key_use, "First bad claim went through")

    // First proper claim
    const keyInfo1 = await getKeyInformation({
        publicKey: keys.publicKeys[0]
    })
    let passwordForClaim = await hashPassword(base_password + keys.publicKeys[0] + keyInfo1.cur_key_use.toString())
    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
        password: passwordForClaim
    })
    let postGoodClaim = await getKeyInformation({publicKey: keys.publicKeys[0]})
    assert(postGoodClaim.cur_key_use - postBadClaim.cur_key_use == 1, "First good claim failed")

    let preSecondClaimSupply = await getKeySupplyForDrop({dropId})
    // Second claim, no PW needed
    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
    })

    let postSecondClaimSupply = await getKeySupplyForDrop({dropId})
    assert(preSecondClaimSupply - postSecondClaimSupply == 1, "Second good claim failed")
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

    // await protectedDropTest(fundingAccount)
    await protectedUseTest(fundingAccount)
}


tests()

