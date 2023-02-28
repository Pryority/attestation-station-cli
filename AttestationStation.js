const { ethers, AlchemyProvider, Wallet, Contract, AbiCoder, keccak256, SigningKey, getBytes, toUtf8Bytes, toBeHex, hexlify, isHexString } = require('ethers');
const prompts = require('prompts');
const abi = require('./attestation-station-abi.json');

class AttestationStation {
  constructor(providerUrl, contractAddress) {
    this.providerUrl = providerUrl;
    this.contractAddress = contractAddress;
    // this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8546','optimism-goerli');
    this.provider = new AlchemyProvider('optimism-goerli', 'SBWx0Z_XHGldPWGUkjSB4Cm0-Vh0N4y_');
    this.contract = new Contract(contractAddress, abi, this.provider);
  }
  
  async attest(attestations) {
    if (!attestations || attestations.length === 0) {
      return Promise.resolve([]);
    }
    const tx = await this.contract.connect(this.signer).attest(attestations);
    const receipt = await tx.wait();
    return receipt;
  }  

  async recoverAddressFromSignature(message, signature) {
    // const msgHash = toBeArray(message);
    const sigParams = ethers.Signature.from(signature);
    const recoveryId = sigParams.recoveryParam ? sigParams.recoveryParam : 0;
    const publicKey = SigningKey.recoverPublicKey(message, { r: sigParams.r, s: sigParams.s }, recoveryId);
    const recoveredAddress = await computeAddress(publicKey);
    return recoveredAddress;
  }

  async getSigner() {
    const privateKey = await this.getInput("Enter your private key: ", "text");
    console.log('PRIVATE KEY AS BUFFER', privateKey);
    const signer = new Wallet(hexlify(privateKey), this.provider);
    console.log('SIGNER ADDRESS', signer.address);
    return signer;
  }
  async getInput(prompt, inputType = "text") {
    const input = await prompts({
      type: inputType,
      name: "value",
      message: prompt
    });
    
    const inputString = `0x${input.value}`;
    
    if (!inputString) {
      console.error("Must provide a PRIVATE KEY to sign and write the attestation.");
      process.exit(1);
    }

    if (!isHexString(inputString)) {
      console.error("Invalid private key format. Must be a hexadecimal string.");
      process.exit(1);
    }
    
    console.log('PRIVATE KEY INPUT VALUE', inputString.slice(2))
    
    const privateKeyBytes = Buffer.from(inputString.slice(2), 'hex');
    return privateKeyBytes;
  }
  
  
  // async getNonce(address) {
  //   return await this.contract.getNonce(address);
  // }
  
  async getAttestationHash(address, data) {
    const abiCoder = new AbiCoder();
    const encodedData = abiCoder.encode(
      ["address", "bytes32"],
      [address, keccak256(data)]
    );
    return keccak256(encodedData);
  }

  async getAttestations(creator, subject, keys) {
    const attestations = await Promise.all(keys.map(async (key) => {
      const attestation = await this.contract.attestations(creator, subject, key);
      return [creator, subject, key, attestation];
    }));
    return attestations.filter((attestation) => attestation[3].length > 0);
  }
}

module.exports = AttestationStation;