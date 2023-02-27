#!/usr/bin/env node

// import { ethers } from 'ethers';
const ethers = require('ethers');
const readline = require('readline');
const yargs = require('yargs');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Define command line options
const argv = yargs
  .usage('Usage: $0 <command> [options]')
  .command('read', 'Read an attestation', (yargs) => {
    yargs
      .option('creator', {
        alias: 'c',
        describe: 'Creator address of the attestation',
        type: 'string',
        demandOption: true,
      })
      .option('subject', {
        alias: 's',
        describe: 'Subject address of the attestation',
        type: 'string',
        demandOption: true,
      })
      .option('key', {
        alias: 'k',
        describe: 'Key of the attestation',
        type: 'string',
        demandOption: true,
      });
  })
  .command('write', 'Write an attestation', (yargs) => {
    yargs
      .option('creator', {
        alias: 'c',
        describe: 'Creator address of the attestation',
        type: 'string',
        demandOption: true,
      })
      .option('subject', {
        alias: 's',
        describe: 'Subject address of the attestation',
        type: 'string',
        demandOption: true,
      })
      .option('key', {
        alias: 'k',
        describe: 'Key of the attestation',
        type: 'string',
        demandOption: true,
      })
      .option('value', {
        alias: 'v',
        describe: 'Value of the attestation',
        type: 'string',
        demandOption: true,
      });
  })
  .option('network', {
    alias: 'n',
    describe: 'Ethereum network',
    type: 'string',
    default: 'optimism-goerli',
  })
  .option('mnemonic', {
    describe: 'Mnemonic of the Ethereum account',
    type: 'string',
    demandOption: true,
  })
  .option('alchemy-api-key', {
    describe: 'API key for Alchemy',
    type: 'string',
    demandOption: true,
  })
  .option('optimism-goerli-url', {
    describe: 'Optimism Goerli RPC URL',
    type: 'string',
    default: 'https://goerli.optimism.io',
  })
  .demandCommand(1, 'You need to specify a command.')
  .help('h')
  .alias('h', 'help')
  .wrap(null)
  .argv;

// Connect to the Ethereum network
const provider = new ethers.providers.AlchemyProvider(
  argv.network,
  argv['alchemy-api-key']
);
const wallet = ethers.Wallet.fromMnemonic(argv.mnemonic);
const connectedWallet = wallet.connect(provider);

// Load contract
const contractAddress = '0xEE36eaaD94d1Cc1d0eccaDb55C38bFfB6Be06C77';
const abi = [
  'function attestations(address creator, address subject, bytes32 key) view returns (bytes memory)',
  'function attest(object[] calldata _attestations) external',
];
const contract = new web3.eth.Contract(abi, contractAddress)

// Here you can add functions that interact with the contract using the contract object created above
async function getAttestations(creator, subject, key) {
  const result = await contract.methods.attestations(creator, subject, key).call()
  return result
}

async function submitAttestation(attestations) {
  const result = await contract.methods.attest(attestations).send({ from: web3.eth.defaultAccount })
  return result
}

