const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { parseNearAmount } = require("@near-js/utils");
const { Account } = require("@near-js/accounts");
const { Near } = require("@near-js/wallet-account");

const keypom = require("@keypom/core");
const {
  initKeypom,
  getEnv,
  createDrop,
    createNFTSeries,
    formatLinkdropUrl
} = keypom

// Change this to your account ID
const FUNDER_ACCOUNT_ID = "minqi.testnet";
const NETWORK_ID = "testnet";
async function createTickDrop() {
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

    const contractNetworkId = NETWORK_ID === "mainnet" ? "near" : NETWORK_ID;

    // ONCE SERIES IS CREATED, THIS WILL WORK
    let { keys, dropId: MAIN_DROP_ID } = await createDrop({
        account: fundingAccount,
        numKeys: 4,
        config: {
            usesPerKey: 2
        },
        depositPerUseNEAR: "0.1",
        basePassword: "event-password",
        passwordProtectedUses: [1],
        fcData: {
            methods: [
                null,
                [
                    {
                        receiverId: `nft-v2.keypom.${contractNetworkId}`,
                        methodName: "nft_mint",
                        args: "",
                        dropIdField: "mint_id",
                        accountIdField: "receiver_id",
                        attachedDeposit: parseNearAmount("0.1")
                    }
                ],
            ]
        }
    });

    // CLAIM THIS FIRST TO CREATE YOUR SERIES
    let { keys: keys2, dropId: dropId2 } = await createDrop({
        account: fundingAccount,
        numKeys: 1,
        config: {
            usesPerKey: 1
        },
        depositPerUseNEAR: "0.1",
        fcData: {
            methods: [
                [
                    {
                        receiverId: `nft-v2.keypom.${contractNetworkId}`,
                        methodName: "create_series",
                        args: JSON.stringify({
                            // Change this token_id if it already exists -> check explorer transaction
                            mint_id: parseInt(MAIN_DROP_ID),
                            metadata: {
                                title: "Near Ukraine Guild - Rust Kyiv Meetup",
                                description: "Rust Kyiv Meetup ticket from Near Ukraine Guild, Human Guild, Brushfam",
                                media: "bafybeicmsn7aqzz7qma6fhkipu7bmfd6huopnhuil5d7nqpwsu4tqggafu",
                                copies: 4
                            }
                        }),
                        attachedDeposit: parseNearAmount("0.1")
                    }
                ],
            ]
        }
    });

    const {contractId: KEYPOM_CONTRACT} = getEnv()
    let tickets = formatLinkdropUrl({
        customURL: "https://kiskesis.github.io/ticketdrop/#/CONTRACT_ID/SECRET_KEY",
        secretKeys: keys.secretKeys,
        contractId: KEYPOM_CONTRACT,
    })
    let nfts = formatLinkdropUrl({
        // customURL: "https://wallet.near.org/linkdrop/CONTRACT_ID/SECRET_KEY",
        customURL: "https://testnet.mynearwallet.com/linkdrop/CONTRACT_ID/SECRET_KEY",
        secretKeys: keys2.secretKeys,
        contractId: KEYPOM_CONTRACT,
    })
    console.log("\nOnly scan tickets once NFT series is created by claiming the link below!!!\n\n" + tickets.join("\n") + "\n");
    console.log("\nCLAIM ME FIRST, I CREATE THE NFT SERIES:\n\n" + nfts.join("\n") + "\n");
    return keys
}

createTickDrop()

module.exports = {
    createTickDrop
}