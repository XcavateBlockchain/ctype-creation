import * as Kilt from '@kiltprotocol/sdk-js'

export async function updateAuthenticationKey(account, authentication, assertionMethod, attesterDidUri) {
  try {
    const api = Kilt.ConfigService.get('api')

    // Create the tx to update the authentication key.
    const didKeyUpdateExtrinsic = api.tx.did.setAttestationKey(
      Kilt.Did.publicKeyToChain(assertionMethod)
    )

    const didSignedExtrinsic = await Kilt.Did.authorizeTx(
      attesterDidUri,
      didKeyUpdateExtrinsic,
      async ({ data }) => ({
        signature: authentication.sign(data),
        keyType: authentication.type
      }),
      account.address
    )

    await Kilt.Blockchain.signAndSubmitTx(didSignedExtrinsic, account)
  } catch (error) {
    console.log(error)
  }
}