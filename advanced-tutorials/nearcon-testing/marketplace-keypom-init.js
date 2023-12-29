const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");


const KEYPOM_CONTRACT = "dev-1699140132547-81980536861656"
const MARKETPLACE = "dev-1699139903521-22131540967192"


async function main(){

    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "minqi.testnet";
    const NETWORK_ID = "testnet";

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

    
    let numKeys = 1
    const TERA_GAS = 1000000000000;
    const MAX_GAS = 300 * TERA_GAS

    await fundingAccount.functionCall({
        contractId: KEYPOM_CONTRACT,
        methodName: "new",
        args: {
            root_account: "testnet",
            owner_id: "minqi.testnet",
            contract_metadata: {
                version: "3.0.0",
                link: "allowlist"
            }
        },
        gas: MAX_GAS,
    })
}


main()



module.exports = {
    main,
}
