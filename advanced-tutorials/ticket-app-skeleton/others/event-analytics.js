const path = require("path");
const homedir = require("os").homedir();
const { UnencryptedFileSystemKeyStore } = require("@near-js/keystores-node");
const { Account } = require("@near-js/accounts");
const { parseNearAmount } = require("@near-js/utils");
const { Near } = require("@near-js/wallet-account");

const keypom = require("@keypom/core");

const {
	initKeypom,
    getDrops,
    getKeysForDrop,
	getEnv,
	createDrop,
    formatLinkdropUrl,
} = keypom

async function countTickets() {
   // Connect to NEAR

   // Get drop and keys

   // Compile data
}

countTickets()

module.exports = {
    countTickets,
}
