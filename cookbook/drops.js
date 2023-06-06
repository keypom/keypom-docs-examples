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
    trialSignAndSendTxns
} = keypom




async function simpleTests(fundingAccount) {
    // Creating drop with 2 single use keys
    let {keys: keys1, dropId: dropId1} = await createDrop({
        account: fundingAccount,
        numKeys: 2,
        depositPerUseNEAR: "0.1",
    });

    const keyInfo1 = await getKeyInformation({
        publicKey: keys1.publicKeys[0]
    })
    assert(keyInfo1.drop_id === dropId1, `First drop failed.`)


    
    // Creating drop with 0 single use keys
    let {dropId: dropId2} = await createDrop({
        account: fundingAccount,
        depositPerUseNEAR: "0.001",
    });

    let numKeys = 200
    let keysAdded = 0;
    let allSecretKeys = [];
    while (keysAdded < numKeys) {
        const keysToAdd = Math.min(50, numKeys - keysAdded);
        const {secretKeys, publicKeys} = await generateKeys({
            numKeys: keysToAdd,
        });
        await addKeys({
            account: fundingAccount,
            dropId: dropId2,
            publicKeys
        });
        keysAdded += keysToAdd;
        allSecretKeys = allSecretKeys.concat(secretKeys);
    }
    // Query for the drop information and also return the key information as well
    let keyInfo2 = await getKeyInformation({
        secretKey: allSecretKeys[5],
    })

    let keySupply2 = await getKeySupplyForDrop({
        dropId: dropId2
    })

    assert(keyInfo2.drop_id === dropId2 && keySupply2 == 200, `Second drop failed.`)

}

async function nftTests(fundingAccount) {
    NFT_TOKEN_ID = 'keypom_test_token_122333'
    NFT_CONTRACT = 'nft.examples.testnet'
    
    // Mint 1 NFT for the drop funder
    await fundingAccount.functionCall({
        contractId: NFT_CONTRACT, 
        methodName: 'nft_mint', 
        args: {
            receiver_id: "minqi.testnet",
            metadata: {
                title: "My Test Keypom NFT",
                description: "NFT from my first NFT Drop!",
                media: "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif",
            },
            token_id: NFT_TOKEN_ID,
        },
        gas: "300000000000000",
        // Cost to cover storage of NFT
        attachedDeposit: parseNearAmount("0.1")
    });

    const { keys } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "1",
        nftData: {
            // NFT Contract Id that the tokens will come from
            contractId: NFT_CONTRACT,
            // Who will be sending the NFTs to the Keypom contract
            senderId: "minqi.testnet",
            // List of tokenIDs
            tokenIds: [NFT_TOKEN_ID]
        }
    });

    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
    })

    let viewReturn = await fundingAccount.viewFunction({
        contractId: NFT_CONTRACT,
		methodName: 'nft_token',
        args: {
            token_id: NFT_TOKEN_ID
        }
    })
    assert(viewReturn.owner_id === "minqianlu.testnet", `NFT drop failed.`)

}

async function ftTests(fundingAccount) {
    YOUR_ACCOUNT = "minqi.testnet"

    // Get amount of FTs to transfer. In this scenario, we've assumed it to be 1 for one single use key.
    let amountToTransfer = parseNearAmount("1")
    FT_CONTRACT = "ft.keypom.testnet"

    // Get funder's fungible token balance
    let funderFungibleTokenBal = await fundingAccount.viewFunction({
        contractId: FT_CONTRACT, 
        methodName: 'ft_balance_of',
        args: {
            account_id: YOUR_ACCOUNT
        }
    });

    // Check if the owner has enough FT balance to fund drop
    if (new BN(funderFungibleTokenBal).lte(new BN(amountToTransfer))){
        throw new Error('funder does not have enough Fungible Tokens for this drop. Top up and try again.');
    }

    const { keys } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: 1,
        ftData: {
            contractId: FT_CONTRACT,
            senderId: YOUR_ACCOUNT,
            // This balance per use is balance of human readable FTs per use. 
            amount: "1"
            // Alternatively, you could use absoluteAmount, which is dependant on the decimals value of the FT
            // ex. if decimals of an ft = 8, then 1 FT token would be absoluteAmount = 100000000
        },
    });

    let preClaimBal = await fundingAccount.viewFunction({
        contractId: FT_CONTRACT,
		methodName: 'ft_balance_of',
        args: {
            account_id: "minqianlu.testnet"
        }
    })

    await claim({
        accountId: "minqianlu.testnet",
        secretKey: keys.secretKeys[0],
    })

    let postClaimBal = await fundingAccount.viewFunction({
        contractId: FT_CONTRACT,
		methodName: 'ft_balance_of',
        args: {
            account_id: "minqianlu.testnet"
        }
    }) 

    let balChange = (postClaimBal - preClaimBal)

    assert(balChange == "1", `FT drop failed.`)

}

async function fcTests(fundingAccount) {
    MY_CONTRACT = "guest-book.examples.keypom.testnet"
    YOUR_ACCOUNT = "minqi.testnet"
    
    console.log("SINGLE USE, SINGLE METHOD")
    // Creating a single key single use FC drop
    let {keys: key1} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                // First key use
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "first"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                ],
            ]   
        }   
    })

    await claim({accountId: "minqianlu.testnet", secretKey: key1.secretKeys[0],})
    let messages1 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages1[messages1.length - 1].sender == "v2.keypom.testnet" && messages1[messages1.length - 1].text == "first", `FC drop failed.`)
    // Buffer
    await fundingAccount.functionCall({
        contractId: MY_CONTRACT,
        methodName: "add_message",
        args: {
            text: "BUFFER BUFFER BUFFER"
        },
        attachedDeposit: parseNearAmount("0.001")
    })

    
    console.log("MULTI-USE SINGLE METHOD")
    // Creating a single key single use FC drop
    let {keys: key2} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config: {
            usesPerKey: 2
        },
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                // First key use
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "first"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                ],
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "first-point-five"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    }
                ],
            ]   
        }   
    })
    // First claim
    await claim({accountId: "minqianlu.testnet", secretKey: key2.secretKeys[0],})
    let messages2 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages2[messages2.length - 1].sender == "v2.keypom.testnet" && messages2[messages2.length - 1].text == "first", `FC drop failed.`)

    // Second claim
    await claim({accountId: "minqianlu.testnet", secretKey: key2.secretKeys[0],})
    messages2 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages2[messages2.length - 1].sender == "v2.keypom.testnet" && messages2[messages2.length - 1].text == "first-point-five", `FC drop failed.`)
    // Buffer
    await fundingAccount.functionCall({
        contractId: MY_CONTRACT,
        methodName: "add_message",
        args: {
            text: "BUFFER BUFFER BUFFER"
        },
        attachedDeposit: parseNearAmount("0.001")
    })


    console.log("SINGLE USE MULTI-METHOD")
    // Creating a single key single use FC drop
    let {keys: key3} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                // // First key use
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "second"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "third"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "fourth"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                ],
            ]   
        }   
    })
    await claim({accountId: "minqianlu.testnet", secretKey: key3.secretKeys[0],})
    let messages3 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages3[messages3.length - 3].sender == "v2.keypom.testnet" && messages3[messages3.length - 3].text == "second" &&
           messages3[messages3.length - 2].sender == "v2.keypom.testnet" && messages3[messages3.length - 2].text == "third" &&
           messages3[messages3.length - 1].sender == "v2.keypom.testnet" && messages3[messages3.length - 1].text == "fourth", `FC drop failed.`)
    // Buffer
    await fundingAccount.functionCall({
        contractId: MY_CONTRACT,
        methodName: "add_message",
        args: {
            text: "BUFFER BUFFER BUFFER"
        },
        attachedDeposit: parseNearAmount("0.001")
    })

    console.log("MULTI-USE MULTI-METHOD")
    // Creating a single key single use FC drop
    let {keys: key4} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config: {
            usesPerKey: 3
        },
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                // First key use
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "first"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    }
                ],
                // Second key use
                null,

                // Third key use
                [
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "second"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "third"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                    {
                        receiverId: MY_CONTRACT,
                        methodName: "add_message",
                        args: JSON.stringify({
                            text: "fourth"
                        }),
                        attachedDeposit: parseNearAmount("0.001"),
                    },
                ],
            ]   
        }   
    })
    // First claim
    await claim({accountId: "minqianlu.testnet", secretKey: key4.secretKeys[0],})
    let messages4 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages4[messages4.length - 1].sender == "v2.keypom.testnet" && messages4[messages4.length - 1].text == "first", `FC drop failed.`)

    // Second claim, should do nothing
    await claim({accountId: "minqianlu.testnet", secretKey: key4.secretKeys[0],})
    messages4 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages4[messages4.length - 1].sender == "v2.keypom.testnet" && messages4[messages4.length - 1].text == "first", `FC drop failed.`)

    // Third claim
    await claim({accountId: "minqianlu.testnet", secretKey: key4.secretKeys[0],})
    messages4 = await fundingAccount.viewFunction({contractId: MY_CONTRACT, methodName: 'get_messages', args: {from: 200, limit: 500}})
    assert(messages4[messages4.length - 4].sender == "v2.keypom.testnet" && messages4[messages4.length - 4].text == "first" &&
           messages4[messages4.length - 3].sender == "v2.keypom.testnet" && messages4[messages4.length - 3].text == "second" &&
           messages4[messages4.length - 2].sender == "v2.keypom.testnet" && messages4[messages4.length - 2].text == "third" &&
           messages4[messages4.length - 1].sender == "v2.keypom.testnet" && messages4[messages4.length - 1].text == "fourth", `FC drop failed.`)
    // Buffer
    await fundingAccount.functionCall({
        contractId: MY_CONTRACT,
        methodName: "add_message",
        args: {
            text: "BUFFER BUFFER BUFFER"
        },
        attachedDeposit: parseNearAmount("0.001")
    })
}

async function fcNFTTests(fundingAccount) {
    // Create drop with 10 keys and 2 key uses each
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                [
                    {
                        receiverId: `nft-v2.keypom.testnet`,
                        methodName: "nft_mint",
                        args: "",
                        dropIdField: "mint_id",
                        accountIdField: "receiver_id",
                        attachedDeposit: parseNearAmount("0.1")
                    }
                ],
            ]   
        }   
    })

    await createNFTSeries({
        account: fundingAccount,
        dropId,
        metadata: {
            title: "Moon NFT Ticket!",
            description: "A cool NFT POAP for the best dog in the world.",
            media: "bafybeibwhlfvlytmttpcofahkukuzh24ckcamklia3vimzd4vkgnydy7nq",
            copies: 1
        }
    }); 

    let preClaimNFTs = await fundingAccount.viewFunction({
        contractId: "nft-v2.keypom.testnet",
		methodName: 'nft_supply_for_owner',
        args: {
            account_id: "minqianlu.testnet"
        }
    })

    await claim({accountId: "minqianlu.testnet", secretKey: keys.secretKeys[0],})

    let postClaimNFTs = await fundingAccount.viewFunction({
        contractId: "nft-v2.keypom.testnet",
		methodName: 'nft_supply_for_owner',
        args: {
            account_id: "minqianlu.testnet"
        }
    })

    assert(postClaimNFTs - preClaimNFTs == 1, `FC drop failed.`)
    

    
}

async function trialTests(fundingAccount) {
    // What contracts can the trial account call?
const callableContracts = [
        'guest-book.examples.keypom.testnet',
        'v1.social08.testnet'
    ]
    // What is the maximum amount of $NEAR that can be attached to a call for each callable contract?
    // 1 NEAR for guestbook, 2 NEAR for NEAR social
    const maxAttachableNEARPerContract = [
        '1.5',
        '2'
    ]
    // What methods can the trial account call?
    // Any function can be called on either contracts. 
    const callableMethods = [
        ['*'],
        ['*']
    ]

    const wasmDirectory = `${require('path').resolve(__dirname, '..')}/cookbook/ext-wasm/trial-accounts.wasm`
    const {dropId, keys: {secretKeys: trialSecretKeys, publicKeys: trialPublicKeys}} = await createTrialAccountDrop({
        account: fundingAccount,
        numKeys: 1,
        contractBytes: [...readFileSync(wasmDirectory)],
        // How much $NEAR should be made available to the trial account when it's created?
        startingBalanceNEAR: 2.5,
        callableContracts,
        callableMethods,
        maxAttachableNEARPerContract,
        // repayAmountNEAR: 0.6,
        // repayTo: "dennis.near",
        // Once the trial account has spent this much $NEAR, the trial will be over.
        trialEndFloorNEAR: 1.25
    })

    const desiredAccountId = `${dropId}-keypom.testnet`
    const trialSecretKey = trialSecretKeys[0]
    await claimTrialAccountDrop({
        desiredAccountId,
        secretKey: trialSecretKeys[0],
    })

    console.log('desiredAccountId: ', desiredAccountId)
    console.log(`trialSecretKey: ${JSON.stringify(trialSecretKey)}`)
    const txns = [{
        receiverId: callableContracts[0],
        actions: [
            {
                type: 'FunctionCall',
                params: {
                    methodName: 'add_message',
                    args: {
                        text: "Trial Account Cookbook Test"
                    },
                    gas: '30000000000000',
                    deposit: parseNearAmount('1.5')
                },
            },
        ],
    }];

    await trialSignAndSendTxns({
        trialAccountId: desiredAccountId,
        trialAccountSecretKey: trialSecretKey,
        txns
    })
    try{
        const txns_fail = [{
            receiverId: callableContracts[0],
            actions: [
                // Second one should fail
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'add_message',
                        args: {
                            text: "Trial Account Cookbook Test 2"
                        },
                        gas: '30000000000000',
                        deposit: parseNearAmount('1')
                    },
                },
            ],
        }];
    
        await trialSignAndSendTxns({
            trialAccountId: desiredAccountId,
            trialAccountSecretKey: trialSecretKey,
            txns: txns_fail
        })
    } catch(e){
        console.log("Balance limit reached, as expected")
    }
    
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

    // await simpleTests(fundingAccount)
    // await nftTests(fundingAccount)
    //await fcTests(fundingAccount)
    //await fcNFTTests(fundingAccount)
    await trialTests(fundingAccount)
}


tests()

