const { initKeypom, createDrop, getEnv, formatLinkdropUrl, claim, withdrawBalance, addToBalance, getUserBalance, generateKeys, addKeys, nftTransferCall } = require("@keypom/core");
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { connect, Near } = require("@near-js/wallet-account");
const { assert } = require("console");
const { parseNearAmount, formatNearAmount } = require("@near-js/utils");
const { BN } = require("bn.js");
const path = require("path");
const homedir = require("os").homedir();
const TERA_GAS = 1000000000000;
const NFT_CONTRACT = "nft.examples.testnet";


const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'misc/results/nft-costs.csv',
  header: [
    {id: 'numKeys', title: 'Number of Keys'},
    {id: 'DropCost', title: 'Drop Creation Cost'},
    {id: 'KeyCost', title: 'Key Cost'},
    {id: 'ClaimCost', title: 'Depleted Drop Cost'},
  ]
});

async function nftSetup(fundingAccount, numKeys){
    let token_ids = []
    for(var i = 0; i < numKeys; i++){
        try{
            let tokenId = `ar-${numKeys}-keypom-test-token-${i}`;
            // Mint 1 NFT for the funder from the NFT contract outlined in the NFT_DATA
	        await fundingAccount.functionCall({
	        	contractId: NFT_CONTRACT, 
	        	methodName: 'nft_mint', 
	        	args: {
	        		receiver_id: fundingAccount.accountId,
	        		metadata: {
	        		    title: "My First Keypom NFT",
	        		    description: "NFT from my first NFT Drop!",
	        		    media: "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif",
	        		},
	        		token_id: tokenId,
	        	},
	        	// Cost to cover storage of NFT
                attachedDeposit: parseNearAmount("0.00839")
	        });
            await fundingAccount.functionCall({
	        	contractId: NFT_CONTRACT, 
	        	methodName: 'nft_approve', 
	        	args: {
	        		account_id: "v2.keypom.testnet",
	        		token_id: tokenId,
	        	},
                // NFT approve requires 1 yocto 
                attachedDeposit: parseNearAmount("0.00290")

            });
            token_ids.push(tokenId)
        }
        catch(e){
            console.log(`ERROR HAS OCCURED ${e}`)
        }   
    }
    return token_ids
}

async function DropCreate(fundingAccount, numKeys, startBal, token_ids){
	const {dropId} = await createDrop({
	    account: fundingAccount,
	    depositPerUseNEAR: "0.1",
        nftData: {
            // NFT Contract Id that the tokens will come from
		    contractId: NFT_CONTRACT,
		    // Who will be sending the NFTs to the Keypom contract
		    senderId: fundingAccount.accountId,
		    // List of tokenIDs
		    tokenIds: []
        },
        config: {
            usage:{
                refundDeposit: true,
                autoDeleteDrop: true
            }
        },
        useBalance: true
	});

    console.log(`ALL TOKENS: ${token_ids}`)

    let nftsAdded = 0;
    let count = 0;
    while (nftsAdded < token_ids.length) {
        const nftsToAdd = Math.min(5, token_ids.length - nftsAdded);
        console.log(`I AM HERE, TOKENS ARE ${token_ids.slice(count, count + 5)}`)
        // FOR SOME REASON, THIS IS DOUBLE TRANSFERRING THE SAME NFT
        await nftTransferCall({
            account: fundingAccount,
            contractId: NFT_CONTRACT,
            tokenIds: token_ids.slice(count, count + 5),
            dropId
        });
        nftsAdded += nftsToAdd;
        count += 5;
    } 

    const postDropBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })

    let dropCost = (new BN(parseNearAmount(startBal.toString())).sub(new BN(postDropBal)))

    let keysAdded = 0;
    let allSecretKeys = [];
    while (keysAdded < numKeys) {
        const keysToAdd = Math.min(50, numKeys - keysAdded);
        const {secretKeys, publicKeys} = await generateKeys({
            numKeys: keysToAdd,
        });
        await addKeys({
            account: fundingAccount,
            dropId,
            publicKeys,
            useBalance: true
        });
        keysAdded += keysToAdd;
        allSecretKeys = allSecretKeys.concat(secretKeys);
    }        
    
    const postKeyBal = await getUserBalance({
        accountId: fundingAccount.accountId,
    })
    let keyCost = (new BN(postDropBal).sub(new BN(postKeyBal)))


    return {allSecretKeys, dropCost, keyCost}
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

async function claimDrop(fundingAccount, allSecretKeys){
    // Claiming all used accounts should be easy
    for(const secretKey of allSecretKeys){
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
          DropCost: 0,
          KeyCost: 0,
          ClaimCost: 0,
        }
      ];

    
    // loop for 10^x keys
    for(var i = 0; i < 2; i++){
        let NUM_KEYS = 10**i;
        console.log(`${NUM_KEYS} KEY TEST`)
        let token_ids = await nftSetup(fundingAccount, NUM_KEYS);

        const startBal = 0.5*NUM_KEYS;
        await resetBal(fundingAccount, startBal)

        let {allSecretKeys, dropCost, keyCost} = await DropCreate(fundingAccount, NUM_KEYS, startBal, token_ids)
        let {costs: creationCost, currentBal: postCreationBal} = await getCosts(fundingAccount, startBal)
        await claimDrop(fundingAccount, allSecretKeys)
        let {costs: claimCost, currentBal: postClaimBal} = await getCosts(fundingAccount, formatNearAmount(postCreationBal.toString()))
        
        csvData.push({
            numKeys: NUM_KEYS,
            DropCost: parseFloat(formatNearAmount(dropCost.toString())),
            KeyCost: parseFloat(formatNearAmount(keyCost.toString())),
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

