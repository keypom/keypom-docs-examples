const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");
const { createHash } = require("crypto");
const { readFileSync } = require('fs');
const { writeFile, mkdir, readFile } = require('fs/promises');

const keypom = require("@keypom/core");
const { DAO_CONTRACT, DAO_BOT_CONTRACT, DAO_BOT_CONTRACT_MAINNET, DAO_CONTRACT_MAINNET } = require("./configurations");
const { generatePasswordForClaim, generatePasswordsForKey, hash, sdkHash } = require("./utils");
//const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const DROP_ID = "nearcon-2023"
const {
    initKeypom,
    getEnv,
    createDrop,
    formatLinkdropUrl,
    generateKeys,
    hashPassword
} = keypom

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

    let numKeys = 100
    
    try{
        var result = await fundingAccount.viewFunction({
            contractId: KEYPOM_CONTRACT,
            methodName: "get_drop_information",
            args: {
                drop_id: DROP_ID
            }
        })
        console.log(result)
        console.log(`DROP EXISTS`)
    }catch(e){
        createNearconDrop(fundingAccount)
        console.log(`DROP DOES NOT EXIST!`)
    }

    let doesDropExist = false
    while(!doesDropExist){
        try{
            var result = await fundingAccount.viewFunction({
                contractId: KEYPOM_CONTRACT,
                methodName: "get_drop_information",
                args: {
                    drop_id: DROP_ID
                }
            })
            doesDropExist = true
        }catch(e){
        }
    }


    let keyData = {
      keyPairs: [],
      publicKeys: [],
      secretKeys: [],
      passwords: [],
      owner: []
    };

    // Loop through from 0 -> numKeys 50 at a time
    for (let i = 0; i < numKeys; i += 50) {
        // minqi owns half the keys
        let numOwners = Math.min(numKeys - i, 50)/2
        let returnKeyData = await addKeys(fundingAccount, "minqi.testnet", Math.min(numKeys - i, 50), numOwners, DROP_ID)
        for (var returnedKeyData of returnKeyData){
            keyData.keyPairs.push(returnedKeyData.keypair)
            keyData.publicKeys.push(returnedKeyData.public_key)
            keyData.secretKeys.push(returnedKeyData.secret_key)
            keyData.passwords.push(returnedKeyData.password_by_use)
            keyData.owner.push(returnedKeyData.key_owner)
        }
    }
    console.log(`Added ${keyData.owner.length} keys`)

    let keypairString = '';
    let passwordString = '';
    let ownerString = '';

    // Loop through each secret key
    var i = 0;
    for (let i = 0; i < keyData.owner.length; i++) {
        keypairString += `${keyData.publicKeys[i]}, ${keyData.secretKeys[i]}` + `\n`;
        passwordString += `${JSON.stringify(keyData.passwords[i])}` + `\n`;
        ownerString += `${keyData.owner[i]}` + `\n`;
        
    }

    await writeFile(path.resolve(__dirname, 'keypairs.json'), keypairString);
    await writeFile(path.resolve(__dirname, 'passwords.json'), passwordString);
    await writeFile(path.resolve(__dirname, 'owners.json'), ownerString);

}

async function createNearconDrop(fundingAccount) {
    
    // Keep track of an array of the key pairs we create and the public keys we pass into the contract
	// let keyPairs = await generateKeyPairs(1); 

    let asset_data = [
        {uses: 1, assets: [null], config: {permissions: "claim"}}, // Password protected scan into the event
        {uses: 1, assets: [null], config: {permissions: "create_account_and_claim", account_creation_keypom_args: {drop_id_field: "drop_id"}, root_account_id: "testing-nearcon23.testnet"}},
      ];

	try {
		await fundingAccount.functionCall({
			contractId: KEYPOM_CONTRACT, 
			methodName: 'create_drop', 
			args: {
				drop_id: DROP_ID,
                asset_data,
                key_data: [],
                drop_config:{
                    // delete_empty_drop: false,
                    extra_allowance_per_key: parseNearAmount("0.02")
                }
			}, 
			gas: "300000000000000",
		});
        var result = await fundingAccount.viewFunction({
            contractId: KEYPOM_CONTRACT,
            methodName: "get_drop_information",
            args: {
                drop_id: DROP_ID
            }
        })
        console.log(result)
	} catch(e) {
		console.log('error creating drop: ', e);
	}
    
}


async function addKeys (fundingAccount, originalTicketOwner, numKeys, numOwners, dropId,){
    console.log(`Number of keys to be added: ${numKeys}`)
    let { keyPairs, publicKeys, secretKeys } = await generateKeys({numKeys});
    
    let keyData = [];
    let returnKeyData = [];
    let basePassword = "nearcon23-password";
    let idx = 0;
    
    for (var pk of publicKeys) {
      let password = await generatePasswordsForKey(pk.toString(), [1], basePassword);
    //   let password = hash(hash("banana"))
      keyData.push({
        public_key: pk,
        // password_by_use: {"1": password},
        password_by_use: password,
        key_owner: idx < numOwners ? originalTicketOwner : null,
      });
      returnKeyData.push({
        keypair: keyPairs[idx],
        public_key: pk,
        secret_key: secretKeys[idx],
        password_by_use: password,
        key_owner: idx < numOwners ? originalTicketOwner : null,
      });
      idx += 1;
    }

    try {
		await fundingAccount.functionCall({
			contractId: KEYPOM_CONTRACT, 
			methodName: 'add_keys', 
			args: {
				drop_id: dropId,
                key_data: keyData,
			}, 
			gas: "300000000000000",
		});
	} catch(e) {
		console.log('error creating drop: ', e);
	}
  
    return returnKeyData;
  };


main()



module.exports = {
    createNearconDrop,
}
