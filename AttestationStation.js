const { ethers } = require('ethers');
const prompts = require('prompts');
const abi = './attestation-station-abi.json'

class AttestationStation {
  constructor(providerUrl, contractAddress) {
    this.providerUrl = providerUrl;
    this.contractAddress = contractAddress;
    this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8546','optimism-goerli');
    this.contract = new ethers.Contract(contractAddress, abi, this.provider);
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
  
  async attest(attestations) {
    const signer = await this.getSigner();
    const signedAttestations = await Promise.all(attestations.map(async attestation => {
      const { about, key, val } = attestation;
      const nonce = await this.getNonce(signer.address);
      const encodedKey = encodeRawKey(key);
      const attestationHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes32", "bool", "uint256"],
          [about, encodedKey, val === 1, nonce]
        )
      );
      const signature = await signer.signMessage(ethers.utils.arrayify(attestationHash));
      return { about, key, val, nonce, signature };
    }));
    const tx = await this.contract.attest(signedAttestations);
    const rcpt = await tx.wait();
    return rcpt;
  }
  
  async getSigner() {
    const privateKey = await this.getInput("Enter your private key: ", "text");
    return new ethers.Wallet(privateKey, this.provider);
  }
  
  async getInput(prompt, inputType = "number") {
    const input = await prompts({
      type: inputType,
      name: "value",
      message: prompt
    });
    return input.value;
  }
  
  async getNonce(address) {
    return await this.contract.getNonce(address);
  }
  
  async getAttestations(creator, subject, keys) {
    const attestations = await Promise.all(keys.map(async (key) => {
      const attestation = await this.contract.attestations(creator, subject, key);
      return [creator, subject, key, attestation];
    }));
    return attestations.filter((attestation) => attestation[3].length > 0);
  }
}

function encodeRawKey(rawKey) {
  if (rawKey.length < 32) {
    return ethers.utils.formatBytes32String(rawKey);
  } else {
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rawKey));
    return hash.slice(0,64)+'ff';
  }
}

module.exports = AttestationStation;