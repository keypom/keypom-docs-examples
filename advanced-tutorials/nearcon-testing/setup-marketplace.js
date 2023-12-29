const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { KeyPair } = require("@near-js/crypto")
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

    const KEPYOM_ACCOUNT = new Account(near.connection, KEYPOM_CONTRACT)
    const MARKETPLACE_ACCOUNT = new Account(near.connection, MARKETPLACE)

    
    let numKeys = 1
    const TERA_GAS = 1000000000000;
    const MAX_GAS = 300 * TERA_GAS

    // await fundingAccount.functionCall({
    //     contractId: MARKETPLACE,
    //     methodName: "new",
    //     args: {
    //         contract_owner: MARKETPLACE,
    //         keypom_contract: KEYPOM_CONTRACT
    //     },
    //     gas: MAX_GAS,
    // })

    // await MARKETPLACE_ACCOUNT.functionCall({
    //     contractId: KEYPOM_CONTRACT,
    //     methodName: "add_to_balance",
    //     attachedDeposit: parseNearAmount("100"),
    // })

    // let event_id = "earth-party"
    
    // try{
    //     await fundingAccount.functionCall({
    //         contractId: MARKETPLACE,
    //         methodName: "list_event",
    //         args: {
    //             // New account ID from user input
    //             event_id,
    //             max_markup: 5
    //         },
    //         gas: MAX_GAS,
    //         attachedDeposit: parseNearAmount("1")
    //     })
    // }catch(e){
    //     console.log(e)
    // }

    // try{
    //     console.log("bagel")
    //     await fundingAccount.functionCall({
    //         contractId: MARKETPLACE,
    //         methodName: "modify_event_details",
    //         args: {
    //             // New account ID from user input
    //             event_id,
    //             new_name: "Earth Party",
    //             new_description: "Join Earth, the unremarkable cat with a lukewarm interest in blockchain, for an exceptionally ordinary party on the Earth's surface. This event is exclusively for NEAR blockchain developers who can't think of anything better to do. Experience the thrill of mediocrity with gravity-bound dance floors, generic snacks, and an atmosphere that lacks any semblance of excitement or innovation.",
    //         },
    //         gas: MAX_GAS,
    //         attachedDeposit: parseNearAmount("1")
    //     })
    // }catch(e){
    //     console.log(e)
    // }

    const dropId_premium = "drop-id-premium-earth";
    let key_data_vec_p = []
    for(i = 0; i < 15; i++){
        let keyPair = KeyPair.fromRandom('ed25519'); 
        console.log(keyPair.publicKey.toString())
        let key_obj = {
            public_key: keyPair.publicKey.toString(),
            key_owner: "mintlu.testet"
        }
        key_data_vec_p.push(key_obj)
    }
    console.log(key_data_vec_p)
    try{
        await fundingAccount.functionCall({
            contractId: KEYPOM_CONTRACT,
            methodName: "add_keys",
            args: {
                drop_id: dropId_premium,
                key_data: key_data_vec_p
            },
            attachedDeposit: parseNearAmount("5"),
            gas: MAX_GAS,
        })
    }catch(e){ console.log(e)}
    // try{
    //     await fundingAccount.functionCall({
    //         contractId: KEYPOM_CONTRACT,
    //         methodName: "create_drop",
    //         args: {
    //             drop_id: dropId_premium,
    //             asset_data: [{
    //                 assets: [null],
    //                 uses: 2
    //             }],
    //             key_data: [],
    //         },
    //         gas: MAX_GAS,
    //         attachedDeposit: parseNearAmount("1")
    //     })
    // }catch(e){
    //     console.log(e)
    // }

    let key_data_vec = []
    for(i = 0; i < 10; i++){
        let keyPair = KeyPair.fromRandom('ed25519'); 
        console.log(keyPair.publicKey.toString())
        let key_obj = {
            public_key: keyPair.publicKey.toString(),
            key_owner: "mintlu.testet"
        }
        key_data_vec.push(key_obj)
    }
    console.log(key_data_vec)

    const dropId_normal = "drop-id-normal-earth";
    try{
        await fundingAccount.functionCall({
        contractId: KEYPOM_CONTRACT,
        methodName: "add_keys",
        args: {
            drop_id: dropId_normal,
            key_data: key_data_vec
        },
        attachedDeposit: parseNearAmount("5"),
        gas: MAX_GAS,
    })
}catch(e){ console.log(e)}
    // try{
    //     await fundingAccount.functionCall({
    //         contractId: KEYPOM_CONTRACT,
    //         methodName: "create_drop",
    //         args: {
    //             drop_id: dropId_normal,
    //             asset_data: [{
    //                 assets: [null],
    //                 uses: 2
    //             }],
    //             key_data: [],
    //         },
    //         gas: MAX_GAS,
    //         attachedDeposit: parseNearAmount("1")
    //     })
    // }catch(e){
    //     console.log(e)
    // }

    // let added_drops = {};
    // added_drops[dropId_normal] = {max_tickets: 5, price_by_drop_id: parseNearAmount("100")};
    // added_drops[dropId_premium] = {max_tickets: 2, price_by_drop_id: parseNearAmount("500")};

    // await fundingAccount.functionCall({
    //     contractId: MARKETPLACE,
    //     methodName: 'add_drop_to_event',
    //     args: {
    //         event_id,
    //         added_drops
    //     },
    //     gas: MAX_GAS,
    //     attachedDeposit: parseNearAmount("1")
    // })

    // let event = await  fundingAccount.viewFunction({
    //     contractId: MARKETPLACE,
    //     methodName: "get_event_information", 
    //     args: {event_id}
    // });
    // console.log(event)

    // let keyPair = KeyPair.fromRandom('ed25519'); 
    // console.log(keyPair.publicKey.toString())

    // await fundingAccount.functionCall({
    //     contractId: KEYPOM_CONTRACT,
    //     methodName: "add_to_sale_allowlist",
    //     args: {
    //         drop_id: dropId_normal,
    //         account_ids: [MARKETPLACE]
    //     },
    //     gas: MAX_GAS,
    //     attachedDeposit: parseNearAmount("1")
    // })

    // await fundingAccount.functionCall({
    //     contractId: KEYPOM_CONTRACT,
    //     methodName: "add_to_sale_allowlist",
    //     args: {
    //         drop_id: dropId_premium,
    //         account_ids: [MARKETPLACE]
    //     },
    //     gas: MAX_GAS,
    //     attachedDeposit: parseNearAmount("1")
    // })

    
}



main()



module.exports = {
    main,
}
