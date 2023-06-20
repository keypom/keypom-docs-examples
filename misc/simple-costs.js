const { initKeypom, createDrop, getEnv, formatLinkdropUrl, claim, withdrawBalance, addToBalance, getUserBalance } = require("@keypom/core");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { connect, Near } = require("@near-js/wallet-account");
const { assert } = require("console");
const { parseNearAmount, formatNearAmount } = require("@near-js/utils");
const { BN } = require("bn.js");
const path = require("path");
const homedir = require("os").homedir();
const TERA_GAS = 1000000000000;

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'misc/results/simple-costs.csv',
  header: [
    {id: 'numKeys', title: 'Number of Keys'},
    {id: 'CreationCost', title: 'Upfront Cost'},
    {id: 'ClaimCost', title: 'Depleted Drop Cost'},
  ]
});


async function DropCreate(fundingAccount, numKeys){
	const {keys} = await createDrop({
	    account: fundingAccount,
	    numKeys,
	    depositPerUseNEAR: "0.1",
        config: {
            usage:{
                refundDeposit: true,
                autoDeleteDrop: true
            }
        },
        useBalance: true
	});
	pubKeys = keys.publicKeys

    return keys
}

async function resetBal(fundingAccount, amount){
    // Set balance to 0
    await withdrawBalance({
        account: fundingAccount
    })
    const emptyBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })
    console.log(`empty bal ${emptyBal}`)
    assert(emptyBal == 0, "Withdrawing balance failed")

    // Add specified amount to balance
    await addToBalance({
        account: fundingAccount, 
        amountNear: amount
    });
    const newBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })
    console.log(`re-upped balance: ${newBal}`)
    assert(newBal == parseNearAmount(amount.toString()), "Adding balance failed")
}

async function getCosts(fundingAccount, amount){
    // Query for the drop information for a specific drop
    const currentBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })

    // let costs = parseNearAmount(amount.toString()) - currentBal
    let costs = (new BN(parseNearAmount(amount.toString())).sub(new BN(currentBal)))
    // flag and handle negagtive BNs better
    console.log(`ref balance: ${parseNearAmount(amount.toString())}`)
    console.log(`current bal: ${currentBal}`)
    console.log(`getting costs: ${costs}`)
    return {costs, currentBal}
}

async function claimDrop(fundingAccount, keys){
    // Claiming all used accounts should be easy
    for(const secretKey of keys.secretKeys){
        await claim({
            secretKey,
            accountId: fundingAccount.accountId
        })
    }
}

async function main(){
    // Initiate connection to the NEAR blockchain.
	const network = "testnet"
	const CREDENTIALS_DIR = ".near-credentials";
    const YOUR_ACCOUNT = "minqi-tests.testnet";
	const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);	
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

    let csvData = [
        {
          numKeys: 0,
          CreationCost: 0,
          ClaimCost: 0,
        }
      ];


    for(var i = 0; i < 3; i++){
        let NUM_KEYS = 10**i;
        console.log(`${NUM_KEYS} KEY TEST`)

        const startBal = 0.5*NUM_KEYS;
        await resetBal(fundingAccount, startBal)

        let keys = await DropCreate(fundingAccount, NUM_KEYS)
        let {costs: creationCost, currentBal: postCreationBal} = await getCosts(fundingAccount, startBal)
        await claimDrop(fundingAccount, keys)
        let {costs: claimCost, currentBal: postClaimBal} = await getCosts(fundingAccount, formatNearAmount(postCreationBal.toString()))
        
        csvData.push({
            numKeys: NUM_KEYS,
            CreationCost: parseFloat(formatNearAmount(creationCost.toString())),
            ClaimCost: claimCost.toString()/"1000000000000000000000000"
        })
        console.log(`${NUM_KEYS} KEY TEST COMPLETE`)
    }
    console.log("ALL TESTS COMPLETED")
    console.log(csvData)
    csvWriter
        .writeRecords(csvData)
        .then(()=> console.log('The CSV file was written successfully'))
}

main()

