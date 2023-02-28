const readline = require('readline');
const ethers = require('ethers');
const AttestationStation = require('./AttestationStation.js');

const contractAddress = '0xee36eaad94d1cc1d0eccadb55c38bffb6be06c77';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const goatAddr = "0x1234567890123456789012345678901234567890"; // example goat address
let attestation = {};

console.log("Welcome to the attestation CLI!");

rl.question("Enter '1' to create a new attestation, or '2' to read an existing one: ", function(choice) {
  if (choice === '1') {
    rl.question("Enter the address you are attesting about: ", function(addr) {
      attestation.about = addr;

      rl.question("Enter the key of the attestation: ", function(rawKey) {
        const attendedKey = encodeRawKey(rawKey);
        attestation.key = attendedKey;

        rl.question("Enter the value of the attestation (1 for true, 0 for false): ", async function(val) {
          attestation.val = parseInt(val);

          console.log("New attestation created:", attestation);
          const attestationStation = new AttestationStation('http://localhost:8546', contractAddress);
          tx = await attestationStation.attest([attestation])
          rcpt = await tx.wait()
          console.log(rcpt)
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
          attestationContract.get(attendedAddr, attendedKey).then(function(result) {
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
    return ethers.utils.formatBytes32String(rawKey);
  } else {
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rawKey));
    return hash.slice(0,64)+'ff';
  }
}


