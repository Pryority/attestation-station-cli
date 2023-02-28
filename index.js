const readline = require('readline');
const ethers = require('ethers');
const AttestationStation = require('./AttestationStation.js');
const { AlchemyProvider, keccak256, toUtf8Bytes, solidityPackedKeccak256, toBeArray, encodeBytes32String, hexlify, toBeHex, toBigInt, getBytes } = require('ethers');

const contractAddress = '0xee36eaad94d1cc1d0eccadb55c38bffb6be06c77';
const provider = new AlchemyProvider('optimism-goerli', 'SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let attestation = {};

console.log("Welcome to the attestation CLI!");

rl.question("Enter '1' to create a new attestation, or '2' to read an existing one: ", function(choice) {
  if (choice === '1') {
    rl.question("Enter the address you are attesting about: ", function(addr) {
      attestation.about = addr;

      rl.question("Enter the key of the attestation: ", function(rawKey) {
        const key = encodeRawKey(rawKey);
        attestation.key = key;

        rl.question("Enter the value of the attestation (1 for true, 0 for false): ", async function(val) {
          attestation.val = toBeHex(val);

          console.log("New attestation created:", attestation);
          const attestationStation = new AttestationStation('https://opt-goerli.g.alchemy.com/v2/SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_', contractAddress);
          const msgHash = solidityPackedKeccak256(
            ["address", "bytes32", "bytes"],
            [
                  attestation.about,
                  attestation.key,
                  attestation.val
            ]
          )
          const signer = attestationStation.getSigner();
          const sig = await (await signer).signMessage(toBeArray(msgHash));
          const res = { 
            about: attestation.about, 
            key: attestation.key, 
            val: attestation.val 
          };
          const data = getBytes(res)
          const receipt = await attestationStation.attest(attestation.about, data, sig, signer);
          console.log(receipt)
          process.exit(0);
        });
      });
    });
  } else if (choice === '2') {
    rl.question("Enter the address that wrote/created the attestation: ", function(wroteAddr) {
      rl.question("Enter the address that was attested about: ", function(attestedAddr) {
        rl.question("Enter the key of the attestation: ", function(rawKey) {
          const attendedKey = encodeRawKey(rawKey);
          const attestationContract = new ethers.Contract(wroteAddr, abi, provider);
          attestationContract.get(attestation.about, attendedKey).then(function(result) {
            console.log("The attestation value is:", result.toString());
            process.exit(0);
          }).catch(function(error) {
            console.log("Error reading attestation:", error);
            process.exit(1);
          });
        });
      });
    });
  } else {
    console.log("Invalid choice. Please enter either '1' or '2'");
    process.exit(1);
  }
});

function encodeRawKey(rawKey) {
  if (rawKey.length < 32) {
    return encodeBytes32String(rawKey);
  } else {
    const hash = keccak256(toUtf8Bytes(rawKey));
    return hash.slice(0,64)+'ff';
  }
}


