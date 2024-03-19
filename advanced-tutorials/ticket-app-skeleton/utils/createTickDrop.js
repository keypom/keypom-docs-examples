const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { parseNearAmount } = require("@near-js/utils");
const { Account } = require("@near-js/accounts");
const { connect, Near } = require("@near-js/wallet-account");
var assert = require('assert');

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
    // STEP 1: Initiate a NEAR connection.

    // STEP 2: Create the drop with function call data.

    // STEP 3: Make NFT series for POAPs.
}

createTickDrop()

module.exports = {
    createTickDrop
}
