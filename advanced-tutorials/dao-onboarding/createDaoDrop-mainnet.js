const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");

const keypom = require("@keypom/core");
const { DAO_CONTRACT, DAO_BOT_CONTRACT, DAO_BOT_CONTRACT_MAINNET, DAO_CONTRACT_MAINNET } = require("./configurations");

const {
	initKeypom,
	getEnv,
	createDrop,
    formatLinkdropUrl,
} = keypom

async function createDaoDrop() {
    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "mintlu.near";
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

    const TERA_GAS = 1000000000000;
    let {keys, dropId} = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config: {
            usesPerKey: 1
        },
        requiredGas: (200*TERA_GAS).toString(),  
        depositPerUseNEAR: "0.001",
        fcData: {
            methods: [
                [
                    {
                        // receiverId: DAO_BOT_CONTRACT_MAINNET,
                        receiverId: DAO_BOT_CONTRACT_MAINNET,
                        methodName: "new_auto_registration",
                        args: JSON.stringify({
                            dao_contract: DAO_CONTRACT_MAINNET,
                            proposal: {
                                description: "Auto-Registering New Member",
                                kind: {
                                    AddMemberToRole:{
                                        role: "new-onboardee-role"
                                    }
                                }
                            },
                            human_only: true
                        }),
                        accountIdField: "proposal.kind.AddMemberToRole.member_id",
                        funderIdField: "funder",
                        // Attached deposit of 0.1 $NEAR for when the receiver makes this function call
                        attachedDeposit: parseNearAmount("0.1"),
                    }
                ],
            ]   
        },
    })


    const {contractId: KEYPOM_CONTRACT} = getEnv()
    let links = formatLinkdropUrl({
        customURL: "https://wallet.near.org/linkdrop/CONTRACT_ID/SECRET_KEY",
        secretKeys: keys.secretKeys,
        contractId: KEYPOM_CONTRACT,
    })
    console.log(`
    
    Auto-Registration Links: 
    
    ${links}
    
    `)

    return keys
}

createDaoDrop()

module.exports = {
    createDaoDrop,
}
