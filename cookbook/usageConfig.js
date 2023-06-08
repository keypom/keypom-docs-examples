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
    removeFromSaleAllowlist,
    addToSaleBlocklist,
    removeFromSaleBlocklist,
    getUserBalance,
    addToBalance,
    withdrawBalance,
    getEnv,
    formatLinkdropUrl
} = keypom



// Permissions + refunding deposit when claim is called tests

// Deleting drop when empty and refunding balance tests


async function permissionsAndRefundingTests(fundingAccount) {
    // Only claim
    const { keys: keys_caac, dropId: dropId_caac } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "1",
        config: {
            usage:{
                permissions: `create_account_and_claim`
            }
        }
    });

    // Only caac
    const { keys: keys_claim, dropId: dropId_claim } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "1",
        config: {
            usage:{
                permissions: `claim`
            }
        }
    });
    
    // Refunding when claim is called
    const { keys: keys_refund, dropId: dropId_refund } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "1",
        config: {
            usage:{
                refundDeposit: true
            }
        }
    });

    
    // CAAC ONLY DROP
    console.log("CAAC ONLY: trying to claim")
    try{    
        await claim({accountId: "minqianlu.testnet", secretKey: keys_caac.secretKeys[0]})
        let badClaimOnCAAC = await getKeyInformation({publicKey: keys_caac.publicKeys[0]})
        assert(badClaimOnCAAC.remaining_uses == 1, "claim should not work")
    }
    catch{
        console.log("Claim on CAAC only drop rightfully denied")
    }  

    console.log("CAAC ONLY: using CAAC")
    const {publicKeys, secretKeys} = await generateKeys({numKeys: 2});
    await claim({ 
        secretKey: keys_caac.secretKeys[0],
        newAccountId: `kpm-cookbook-${dropId_caac}.testnet`, 
        newPublicKey: publicKeys[0]
    })
    let goodCAADonCAAC = await getKeySupplyForDrop({dropId: dropId_caac})
    assert(goodCAADonCAAC == 0, "CAAC has failed unexpectedly")
    

    
    // CLAIM ONLY DROP
    console.log("CLAIM ONLY: trying to use CAAC")
    try{
        await claim({ 
            secretKey: keys_claim.secretKeys[0],
            newAccountId: `kpm-cookbook-${dropId_claim}.testnet`, 
            newPublicKey: publicKeys[1]
        })
        let badCAADonClaim = await getKeyInformation({publicKey: keys_claim.publicKeys[0]})
        assert(badCAADonClaim.remaining_uses == 1, "CAAC should not work")
    }catch{
        console.log("CAAC on claim only drop rightfully denied")
    }

    console.log("CLAIM ONLY: trying to use claim")
    await claim({accountId: "minqianlu.testnet", secretKey: keys_claim.secretKeys[0]})
    let  goodClaimOnClaim= await getKeySupplyForDrop({dropId: dropId_claim})
    assert(goodClaimOnClaim == 0, "Claim has failed unexpectedly")


    // REFUNDING
    console.log("Checking refunds")
    const unClaimedFunderBal = await getUserBalance({accountId: "minqi.testnet",})
    await claim({accountId: "minqianlu.testnet", secretKey: keys_refund.secretKeys[0]})
    const claimedFunderBal = await getUserBalance({accountId: "minqi.testnet",})
    console.log(`Funder Bal before: ${unClaimedFunderBal}`)
    console.log(`Funder Bal claimed: ${claimedFunderBal}`)
    assert(claimedFunderBal > unClaimedFunderBal, "funder balance was not changed")
}

async function dropDeletionTests(fundingAccount) {
    // Quick balance test
    await addToBalance({
        account: fundingAccount, 
        amountNear: "5"
    });
    let bal1 = await getUserBalance({accountId: "mintlu.testnet"})
    await withdrawBalance({
        account: fundingAccount
    })
    let bal2 = await getUserBalance({accountId: "mintlu.testnet"})
    assert(bal1 - bal2 == parseNearAmount("5"), "balance funky")

    // Begin drop deletion tests
    await addToBalance({account: fundingAccount, amountNear: "15"});

    // create a drop, now balance is roughly 5 $NEAR
    const { keys, dropId } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "1",
        config: {
            usage:{
                autoDeleteDrop: true,
                autoWithdraw: true
            }
        }
    });
    let funderBal1 = await getUserBalance({accountId: "mintlu.testnet"})
    assert(funderBal1 != 0, "Funder balance somehow 0")


    console.log("Now claiming, funder balance should now be 0 after this")
    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
    let funderBal2 = await getUserBalance({accountId: "mintlu.testnet"})
    assert(funderBal2 == 0, "Funder balance was not successfully withdrawn")
}

async function accountCreationTests(fundingAccount) {

    // Creating FC drop that injects accountId into function call arguments
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config: {
            usage:{
                permissions: `create_account_and_claim`,
                accountCreationFields: {
                    funderIdField: "funder_id"
                }

            },
            dropRoot: "mint-brigade.testnet"
        },
        depositPerUseNEAR: "1",
    })

     // CAAC ONLY DROP
     console.log("CAAC ONLY: trying to claim")
     try{    
         await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0]})
         let badClaimOnCAAC = await getKeyInformation({publicKey: keys.publicKeys[0]})
         assert(badClaimOnCAAC.remaining_uses == 1, "claim should not work")
     }
     catch{
         console.log("Claim on CAAC only drop rightfully denied")
     }  
 
     console.log("CAAC ONLY: using CAAC")
     const {publicKeys, secretKeys} = await generateKeys({numKeys: 2});
     await claim({ 
         secretKey: keys.secretKeys[0],
         newAccountId: `floodgates.mint-brigade.testnet`, 
         newPublicKey: publicKeys[0]
     })
     let goodCAADonCAAC = await getKeySupplyForDrop({dropId: dropId})
     assert(goodCAADonCAAC == 0, "CAAC has failed unexpectedly")
    
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
    const fundingAccountNEW = await near.account("mintlu.testnet");

    // If a NEAR connection is not passed in and is not already running, initKeypom will create a new connection
    // Here we are connecting to the testnet network
    await initKeypom({
        near,
        network
    });

    // await permissionsAndRefundingTests(fundingAccount)
    // await dropDeletionTests(fundingAccountNEW)
    await accountCreationTests(fundingAccount)
}


tests()

