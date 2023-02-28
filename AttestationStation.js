const { ethers, AlchemyProvider, Wallet, Contract, AbiCoder, keccak256, SigningKey } = require('ethers');
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
  
  /**
  async attest(attestations) {
    const signer = await this.getMetamaskSigner();
    const tx = await this.contract.attest(attestations);
    const signedTx = await signer.sendTransaction(tx);
    await signedTx.wait();
    console.log(`Attestations submitted! Tx hash: ${signedTx.hash}`);
  }
 */
  
  // async attest(attestations) {
  //   const signer = await this.getSigner();
  //   const signedAttestations = await Promise.all(attestations.map(async attestation => {
  //     const { about, key, val } = attestation;
  //     // const nonce = await this.getNonce(signer.address);
  //     const encodedKey = encodeRawKey(key);
  //     const attestationHash = ethers.utils.keccak256(
  //       ethers.utils.defaultAbiCoder.encode(
  //         ["address", "bytes32", "bool"],
  //         [about, encodedKey, val === 1]
  //       )
  //     );
  //     const signature = await signer.signMessage(ethers.utils.arrayify(attestationHash));
  //     console.log('\nSIGNATURE\n',signature, '\n--------------\n')
  //     return { about, key, val, signature };
  //   }));
  //   const tx = await this.contract.attest(signedAttestations);
  //   const rcpt = await tx.wait();
  //   return rcpt;
  // }
  
  async attest(address, data, signature, signer) {
    const hash = this.getAttestationHash(address, data);
    const recoveredAddress = this.recoverAddressFromSignature(hash, signature);
    if (address.toLowerCase() !== recoveredAddress.toLowerCase()) {
      throw new Error('Invalid signature');
    }
    const tx = await this.contract.attest(address, data, signer, signature);
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
    return new Wallet(privateKey, this.provider);
  }
  
  async getInput(prompt, inputType = "number") {
    const input = await prompts({
      type: inputType,
      name: "value",
      message: prompt
    });
    return input.value;
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