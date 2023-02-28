import {
  ethers,
  AlchemyProvider,
  Wallet,
  Contract,
  AbiCoder,
  keccak256,
  SigningKey,
  getBytes,
  toUtf8Bytes,
  toBeHex,
  hexlify,
  isHexString,
  Signature,
  SignatureLike,
} from 'ethers';

import prompts, { Falsy, PrevCaller, PromptType } from 'prompts';

import * as abi from './attestation-station-abi.json';

type NewType = PromptType;

class AttestationStation {
  readAttestation(attestationId: string) {
    throw new Error('Method not implemented.');
  }
  providerUrl: string;
  contractAddress: string;
  provider: AlchemyProvider;
  contract: Contract;
  signer: Wallet | undefined;

  constructor(providerUrl: string, contractAddress: string) {
    this.providerUrl = providerUrl;
    this.contractAddress = contractAddress;
    this.provider = new AlchemyProvider(
      'optimism-goerli',
      'SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_'
    );
    this.contract = new Contract(contractAddress, abi, this.provider);
  }

  async attest(attestations: string[]): Promise<any> {
    if (!attestations || attestations.length === 0) {
      return Promise.resolve([]);
    }
    const tx = await this.attest(attestations);
    const receipt = await tx.wait();
    return receipt;
  }

  async recoverAddressFromSignature(
    message: string,
    signature: string
  ): Promise<string> {
    const pk = await this.getSigner();
    const key = new SigningKey(toBeHex(pk.toString()));
    console.log(key.publicKey);
    // const recoveryId = sigParams.recoveryParam ? sigParams.recoveryParam : 0;
    // const publicKey = ethers.utils.recoverPublicKey(
    //   ethers.utils.arrayify(message),
    //   { r: sigParams.r, s: sigParams.s },
    //   recoveryId
    // );
    // const recoveredAddress = ethers.utils.computeAddress(publicKey);
    // return recoveredAddress;
    return 'okay';
  }

  async getSigner(): Promise<Wallet> {
    const privateKey = await this.getInput('Enter your private key: ', 'text');
    console.log('PRIVATE KEY AS BUFFER', privateKey);
    const signer = new Wallet(hexlify(privateKey), this.provider);
    console.log('SIGNER ADDRESS', signer.address);
    this.signer = signer;
    return signer;
  }

  async getInput(
    prompt: string,
    inputType:
      | NewType
      | Falsy
      | PrevCaller<'value', PromptType | Falsy> = 'text'
  ): Promise<Buffer> {
    const input = await prompts({
      type: inputType,
      name: 'value',
      message: prompt,
    });

    const inputString = `0x${input.value}`;

    if (!inputString) {
      console.error(
        'Must provide a PRIVATE KEY to sign and write the attestation.'
      );
      process.exit(1);
    }

    if (!isHexString(inputString)) {
      console.error(
        'Invalid private key format. Must be a hexadecimal string.'
      );
      process.exit(1);
    }

    console.log('PRIVATE KEY INPUT VALUE', inputString.slice(2));

    const privateKeyBytes = Buffer.from(inputString.slice(2), 'hex');
    return privateKeyBytes;
  }

  async getAttestationHash(address: string, data: string): Promise<string> {
    const abiCoder = new AbiCoder();
    const encodedData = abiCoder.encode(
      ['address', 'bytes'],
      [address, keccak256(data)]
    );
    return keccak256(encodedData);
  }

  async getAttestations(
    creator: string,
    subject: string,
    keys: string[]
  ): Promise<any[]> {
    const attestations = await Promise.all(
      keys.map(async (key) => {
        const attestation = await this.contract.attestations(
          creator,
          subject,
          key
        );
        return attestation;
      })
    );
    return attestations;
  }

  async createAttestation(
    creator: string,
    subject: string,
    data: string
  ): Promise<any> {
    const attestationHash = await this.getAttestationHash(subject, data);
    const signature = await this.signer?.signMessage(attestationHash);
    const attestation = {
      creator,
      subject,
      data,
      signature,
    };
    return attestation;
  }

  async verifyAttestation(attestation: any): Promise<boolean> {
    const attestationHash = await this.getAttestationHash(
      attestation.subject,
      attestation.data
    );
    const recoveredAddress = await this.recoverAddressFromSignature(
      attestationHash,
      attestation.signature
    );
    return recoveredAddress.toLowerCase() === attestation.creator.toLowerCase();
  }
}

export default AttestationStation;
