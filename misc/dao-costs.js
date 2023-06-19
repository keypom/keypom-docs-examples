const { initKeypom, createDrop, getEnv, formatLinkdropUrl, claim, withdrawBalance, addToBalance, getUserBalance } = require("@keypom/core");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { connect, Near } = require("@near-js/wallet-account");
const { assert } = require("console");
const { parseNearAmount } = require("@near-js/utils");


const path = require("path");
const homedir = require("os").homedir();
const TERA_GAS = 1000000000000;


async function daoDropCreate(fundingAccount, numKeys){
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
        requiredGas: (120*TERA_GAS).toString(),
        fcData: {
            methods: [
                [
                    {
                        receiverId: "keypom-dao-bot.testnet",
                        methodName: "new_auto_registration",
                        args: JSON.stringify({
                            dao_contract: "moondao.sputnikv2.testnet",
                            proposal: {
                                description: "Auto-Registering New Member",
                                kind: {
                                    AddMemberToRole:{
                                        role: "new-onboardee-role"
                                    }
                                }
                            }
                        }),
                        accountIdField: "proposal.kind.AddMemberToRole.member_id",
                        funderIdField: "funder",
                        // Attached deposit of 0.1 $NEAR for when the receiver makes this function call
                        attachedDeposit: parseNearAmount("0.1"),
                    }
                ],
            ]   
        }
	});
	pubKeys = keys.publicKeys

    return keys
}

async function resetBal(fundingAccount, amount){
    await withdrawBalance({
        account: fundingAccount
    })

    // Query for the drop information for a specific drop
    const emptyBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })
    assert(emptyBal == 0, "Withdrawing balance failed")

    await addToBalance({
        account: fundingAccount, 
        amountNear: amount
    });

    // Query for the drop information for a specific drop
    const newBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })
    assert(newBal == amount, "Withdrawing balance failed")
}

async function getCosts(fundingAccount, amount){
    // Query for the drop information for a specific drop
    const currentBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })

    let costs = amount - currentBal

    return {costs, currentBal}
}

async function claimDaoDrop(fundingAccount, keys){
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


    // 10 keys
    console.log("10 key test")
    const startBal_10keys = 2.5;
    await resetBal(fundingAccount, startBal_10keys)
    let keys = await daoDropCreate(fundingAccount, 10)
    console.log(keys)
    let {costs: creationCost, currentBal: postCreationBal} = await getCosts(fundingAccount, startBal_10keys)
    await claimDaoDrop(fundingAccount, keys)
    let {costs: claimCost, currentBal: postClaimBal} = await getCosts(fundingAccount, postCreationBal)
    csvData.push({
        numKeys: 100,
        CreationCost: creationCost,
        ClaimCost: claimCost
    })
    console.log(csvData)
}

main()

