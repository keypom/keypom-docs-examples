const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { KeyPair } = require("@near-js/crypto")
const { InMemoryKeyStore } = require("@near-js/keystores");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");
const { nearArgsToYocto } = require("@keypom/core/lib/lib/keypom-utils");
const { BN } = require("bn.js");


const KEYPOM_CONTRACT = "dev-1699140132547-81980536861656"
const MARKETPLACE = "dev-1699521073288-13420165222235"


async function main(){

    // Change this to your account ID
    const FUNDER_ACCOUNT_ID = "minqi.testnet";
    const NETWORK_ID = "testnet";

    // Initiate connection to the NEAR blockchain.
    const CREDENTIALS_DIR = ".near-credentials";
    const credentialsPath =  path.join(homedir, CREDENTIALS_DIR);

    let keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);
    // let keyStore = new InMemoryKeyStore()

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
    const non_fundingAccount = new Account(near.connection, "mintlu.testnet")

    const KEYPOM_ACCOUNT = new Account(near.connection, KEYPOM_CONTRACT)

    
    let numKeys = 1
    const TERA_GAS = 1000000000000;
    const MAX_GAS = 300 * TERA_GAS

    let event_id = "moon-party"
    const dropId_premium = "drop-id-premium";
    const dropId_normal = "drop-id-normal";
 

    let event = await  fundingAccount.viewFunction({
        contractId: MARKETPLACE,
        methodName: "get_event_information", 
        args: {event_id}
    });
    console.log(event)

    let keyPair = KeyPair.fromRandom('ed25519'); 
    console.log(keyPair.publicKey.toString())

    let key_to_be_sold = {
        public_key: keyPair.publicKey.toString(),
        key_owner: FUNDER_ACCOUNT_ID
    }

    let nonDropKeyPair = KeyPair.fromRandom('ed25519'); 
    console.log(nonDropKeyPair.publicKey.toString())

    try{
        await fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "buy_initial_sale",
            args: {
                event_id,
                new_key_info: key_to_be_sold,
                // tier 1 = lowest tier, normal
                ticket_tier: 1
            },
            gas: MAX_GAS,
            attachedDeposit: parseNearAmount("20"),
        })
    } catch(e){
        console.log("failed to buy initial sale")
        console.log(e)
    }

    let listed_key_info = await fundingAccount.viewFunction({
        contractId: KEYPOM_CONTRACT,
        methodName: "get_key_information", 
        args: {
            key: keyPair.publicKey.toString()
        }
    });

    console.log(listed_key_info)

    try{
        await fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "nft_approve",
            args:{
                token_id: listed_key_info.token_id,
                account_id: MARKETPLACE,
            },
            attachedDeposit: parseNearAmount("0.000000001"),
            gas: 50 * TERA_GAS,
        })
    }catch(e){
        console.log("failed to approve")
        console.log(e)
    }

    try{
        await non_fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "list_ticket",
            args: {
                key: key_to_be_sold,
                price: parseNearAmount("1"),
                approval_id: 2
            },
            attachedDeposit: parseNearAmount("1")
        })
    }catch(e){
        console.log("failed to maliciously list key, this is good")
        console.log(e)
    }

    try{
        await fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "list_ticket",
            args: {
                key: key_to_be_sold,
                price: parseNearAmount("3"),
                approval_id: 2
            },
            attachedDeposit: parseNearAmount("1"),

        })
    }catch(e){
        console.log("should not be failing")
        console.log(e)
    }
    try{
        await fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "list_ticket",
            args: {
                key: key_to_be_sold,
                price: parseNearAmount("1.5"),
                approval_id: 2
            },
            attachedDeposit: parseNearAmount("1"),

        })
    }catch(e){
        console.log("should not be failing")
        console.log(e)
    }

    // another user
    let key_to_be_sold2 = {
        public_key: keyPair.publicKey.toString(),
        key_owner: "mintlu.testet"
    }
    try{
        await non_fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "buy_initial_sale",
            args: {
                event_id,
                new_key_info: key_to_be_sold2,
                // tier 1 = lowest tier, normal
                ticket_tier: 1
            },
            gas: MAX_GAS,
            attachedDeposit: parseNearAmount("20"),
        })
    } catch(e){
        console.log("failed to buy initial sale")
        console.log(e)
    }

    listed_key_info = await fundingAccount.viewFunction({
        contractId: KEYPOM_CONTRACT,
        methodName: "get_key_information", 
        args: {
            key: key_to_be_sold2.public_key
        }
    });


    try{
        await non_fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "nft_approve",
            args:{
                token_id: listed_key_info.token_id,
                account_id: MARKETPLACE,
            },
            attachedDeposit: parseNearAmount("0.000000001"),
            gas: 50 * TERA_GAS,
        })
    }catch(e){
        console.log("failed to approve")
        console.log(e)
    }

    try{
        await non_fundingAccount.functionCall({
            contractId: MARKETPLACE,
            methodName: "list_ticket",
            args: {
                key: key_to_be_sold2,
                price: parseNearAmount("1"),
                approval_id: 2
            },
            attachedDeposit: parseNearAmount("1")
        })
    }catch(e){
        console.log("failed to maliciously list key, this is good")
        console.log(e)
    }

    

    // let expectedKey = keyPair.publicKey.toString()

    // let key_info = await fundingAccount.viewFunction({
    //     contractId: KEYPOM_CONTRACT,
    //     methodName: "get_key_information", 
    //     args: {key: expectedKey}
    // });
    // console.log(key_info)
    // t.is(key_info.owner_id == ali.accountId, true);
}


main()



module.exports = {
    main,
}
