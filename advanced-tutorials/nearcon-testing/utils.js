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
//const KEYPOM_CONTRACT = "nearcon2023.keypom.testnet"
const KEYPOM_CONTRACT = "testing-nearcon-keypom.testnet"
const DROP_ID = "nearcon-2023"
const {
    initKeypom,
    getEnv,
    createDrop,
    formatLinkdropUrl,
    generateKeys,
    hashPassword
} = keypom


function hash(string, double=false) {
    if (double) {
        return createHash('sha256').update(Buffer.from(string, 'hex')).digest('hex');
    }

    return createHash('sha256').update(Buffer.from(string)).digest('hex');
}

// example: usesWithPassword = [1, 3]
async function generatePasswordsForKey(pubKey, usesWithPassword, basePassword) {
    let passwords = {};

    // Loop through usesWithPassword
    for (var use of usesWithPassword) {
      let pw = basePassword + pubKey + use.toString()
      console.log('pw before double hash: ', pw)
      let firstHash = hash(pw)
      passwords[use] = hash(firstHash, true);
    }
    
    console.log(`pw after double hash: ${passwords[use]}`)
    return passwords;
}

// example: usesWithPassword = [1, 3]
async function generatePasswordForClaim(pubKey, use, basePassword) {
    let password = "";

    let pw = basePassword + pubKey + use.toString()
    console.log('pw for claim before hash: ', pw)
    password = hash(pw);
    console.log(`single hashed claim pw: ${password}`)
    console.log(`double hashed claim pw: ${hash(password)}`)

    return password;
}

async function writeKeyFiles(keyData){
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


async function addKeys (fundingAccount, originalTicketOwner, numKeys, numOwners, dropId, basePassword){
    console.log(`Number of keys to be added: ${numKeys}`)
    let { keyPairs, publicKeys, secretKeys } = await generateKeys({numKeys});
    
    let keyData = [];
    let returnKeyData = [];
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



module.exports = {
    hash,
    generatePasswordsForKey,
    generatePasswordForClaim,
    writeKeyFiles,
    createNearconDrop,
    addKeys
}
