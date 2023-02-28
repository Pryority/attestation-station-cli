#!/usr/bin/env node

const { program } = require('commander');
const { prompt } = require('enquirer');
const { ethers } = require('ethers');
const AttestationStation = require('./AttestationStation.js');

const encodeRawKey = (rawKey) => {
  if (rawKey.length<32) 
     return ethers.utils.formatBytes32String(rawKey)

  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rawKey))
  return hash.slice(0,64)+'ff'
}

const abi = [
  'function attestations(address creator, address subject, bytes32 key) view returns (bytes memory)',
  'function attest(object[] calldata _attestations) external',
];
const contractAddress = '0xee36eaad94d1cc1d0eccadb55c38bffb6be06c77';
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8546','optimism-goerli')
const contract = new ethers.Contract(contractAddress, abi, provider);
console.log(contract.functions)
program
  .command('attestation')
  .description('Read or write an attestation')
  .option('-c, --creator <creator>', 'Creator address')
  .option('-t, --target <target>', 'Target address')
  .option('-k, --key <key>', 'Key')
  .option('-v, --value <value>', 'Value')
  .action(async (options) => {
    let creator, target, key, value, mode = 'read'; // define mode with default value

    // 1. User can manually enter their options for reading or writing an attestation
    if (options.creator && options.target && options.key && options.value) {
      creator = options.creator;
      target = options.target;
      key = options.key;
      value = options.value;
      mode = 'write'; // update mode
      // 2. Otherwise, a user can enter their options when prompted for them after running the main CLI command
    } else {
      const questions = [
        {
          type: 'select',
          name: 'mode',
          message: 'Do you want to read or write an attestation?',
          choices: ['read', 'write'],
        },
        {
          type: 'input',
          name: 'creator',
          message: 'Enter the creator address:',
          when: (answers) => answers.mode === 'write',
        },
        {
          type: 'input',
          name: 'target',
          message: 'Enter the target address:',
          when: (answers) => answers.mode === 'write',
        },
        {
          type: 'input',
          name: 'key',
          message: 'Enter the key:',
          when: (answers) => answers.mode === 'write',
        },
        {
          type: 'input',
          name: 'value',
          message: 'Enter the value:',
          when: (answers) => answers.mode === 'write',
        },
      ];

      const answers = await prompt(questions);
      const { mode } = answers;

      if (mode === 'write') {
        creator = answers.creator;
        target = answers.target;
        key = encodeRawKey(answers.key);
        value = answers.value;
      } else {
        console.log('You must provide creator, target, key, and value to read an attestation.');
        return;
      }
    }

    const attestationStation = new AttestationStation('http://localhost:8546', contractAddress);
    if (mode !== 'read') {
      const result = await attestationStation.read(contract, creator, target, key);
      console.log(`Attestation: ${result}`);
    } else {
      const attestation = {
        about: target,
        key: key,
        val: ethers.utils.toUtf8Bytes(value),
      };
      console.log(provider)
      const user = new ethers.Wallet(privateKey [ provider ] );
      const creatorAddr = await provider.getSigner().address;
      const signedAttestation = await provider.send(attestation);
      const result = await attestationStation.write(contract, signedAttestation, creator);
      console.log(`Transaction hash: ${result.hash}`);
    }
  });

program.parse(process.argv);
