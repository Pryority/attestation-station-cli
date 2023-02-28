import readline from 'readline';
import { ethers } from 'ethers';
import AttestationStation from './AttestationStation';
import {
  AlchemyProvider,
  keccak256,
  toUtf8Bytes,
  solidityPackedKeccak256,
  toBeArray,
  encodeBytes32String,
  hexlify,
  toBeHex,
  toBigInt,
  getBytes,
  Contract,
} from 'ethers';
import abi from './attestation-station-abi.json';

const contractAddress = '0xee36eaad94d1cc1d0eccadb55c38bffb6be06c77';
// const contractAddress = '0xbed744818e96aad8a51324291a6f6cb20a0c22be';
const provider = new AlchemyProvider(
  'optimism-goerli',
  'SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_'
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let attestation: { [key: string]: string } = {};

console.log('Welcome to the attestation CLI!');

rl.question(
  "Enter '1' to create a new attestation, or '2' to read an existing one (default: 1): ",
  async (choice: string) => {
    choice = choice || '1'; // Set default value of '1' if user just hits enter

    if (choice === '1') {
      rl.question(
        'Enter the address you are attesting about (default: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045): ',
        async (addr: string) => {
          attestation.about =
            addr || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Set default value if user just hits enter

          rl.question(
            'Enter the key of the attestation (default: is.a.cat:bool): ',
            async (rawKey: string) => {
              const key = encodeRawKey(rawKey || 'is.a.cat:bool'); // Set default value if user just hits enter
              attestation.key = key;

              rl.question(
                'Enter the value of the attestation (1 for true, 0 for false, default: 1): ',
                async (val: string) => {
                  attestation.val = toBeHex(val || '1'); // Set default value if user just hits enter
                  console.log('New attestation created:', attestation);
                  const attestationStation = new AttestationStation(
                    'https://opt-goerli.g.alchemy.com/v2/SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_',
                    contractAddress
                  );
                  const msgHash = solidityPackedKeccak256(
                    ['address', 'bytes32', 'bytes'],
                    [attestation.about, attestation.key, attestation.val]
                  );
                  const sig = await (
                    await provider.getSigner()
                  ).signMessage(toBeArray(msgHash));
                  console.log('SIGNATURE', sig);
                  const data = {
                    about: attestation.about,
                    key: attestation.key,
                    val: attestation.val,
                  };
                  const attestationContract = new Contract(
                    contractAddress,
                    abi,
                    provider
                  );
                  const tx = await attestationContract.attest(
                    data.about,
                    data.key,
                    data.val,
                    sig
                  );
                  console.log('Transaction sent:', tx.hash);
                  const receipt = await tx.wait();
                  console.log(
                    `Transaction confirmed in block ${receipt.blockNumber}`
                  );
                  rl.close();
                }
              );
            }
          );
        }
      );
    } else if (choice === '2') {
      rl.question(
        'Enter the attestation ID: ',
        async (attestationId: string) => {
          const attestationStation = new AttestationStation(
            'https://opt-goerli.g.alchemy.com/v2/SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_',
            contractAddress
          );
          const attestationData = await attestationStation.readAttestation(
            attestationId
          );
          console.log('Attestation Data:', attestationData);
          rl.close();
        }
      );
    } else {
      console.log("Invalid choice. Please enter '1' or '2'.");
      rl.close();
    }
  }
);

function encodeRawKey(rawKey: string): string {
  const [key, type] = rawKey.split(':');
  if (!type) {
    throw new Error(`Invalid key format: ${rawKey}`);
  }
  switch (type) {
    case 'bool': {
      return encodeBytes32String(key);
    }
    default: {
      throw new Error(`Unsupported key type: ${type}`);
    }
  }
}
