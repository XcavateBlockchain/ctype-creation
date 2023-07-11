import { config as envConfig } from 'dotenv'
import * as Kilt from '@kiltprotocol/sdk-js'

import { generateAccount } from './generateAccount.js'
import { generateKeypairs } from './generateKeypairs.js'

export async function updateFullDid(
  newAuthKeypair,
  fullDid,
  submitterAccount,
  signCallback
) {
  try {
    const api = Kilt.ConfigService.get('api')

    // Create the tx to update the authentication key.
    const didKeyUpdateTx = api.tx.did.setAuthenticationKey(
      Kilt.Did.publicKeyToChain(newAuthKeypair)
    )
    console.log('Got didKeyUpdateTx')

    // Create the tx to remove the service with ID `#my-service`.
    const didServiceRemoveTx = api.tx.did.removeServiceEndpoint(
      Kilt.Did.resourceIdToChain('#my-service')
    )
    console.log('Got didServiceRemoveTx')

    // Create the tx to add a new service with ID `#my-new-service`.
    const newServiceEndpointTx = api.tx.did.addServiceEndpoint({
      id: Kilt.Did.resourceIdToChain('#my-new-service'),
      serviceTypes: [Kilt.KiltPublishedCredentialCollectionV1Type],
      urls: ['https://www.new-example.com'],
    })
    console.log('Got newServiceEndpointTx')

    // Create and sign the DID operation that contains the two (unsigned) txs.
    // This results in a DID-signed tx that can be then signed and submitted to the KILT blockchain by the account
    // authorized in this operation, Alice in this case.
    const authorizedBatchedTxs = await Kilt.Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid,
      extrinsics: [didKeyUpdateTx, didServiceRemoveTx, newServiceEndpointTx],
      sign: signCallback,
      submitter: submitterAccount.address,
    })
    console.log('Got authorizedBatchedTxs')
    // Submit the DID update tx to the KILT blockchain after signing it with the authorized KILT account.
    await Kilt.Blockchain.signAndSubmitTx(authorizedBatchedTxs, submitterAccount)
    console.log('Got signed on chain')

    // Get the updated DID Document.
    const encodedUpdatedDidDetails = await api.call.did.query(
      Kilt.Did.toChain(fullDid)
    )

    console.log('encodedUpdatedDidDetails :: ', encodedUpdatedDidDetails)

    return Kilt.Did.linkedInfoFromChain(encodedUpdatedDidDetails).document
  } catch (error) {
    console.log(error)
  }
}

// Don't execute if this is imported by another file.
// if (require.main === module) {
; (async () => {
  envConfig()

  try {
    await Kilt.connect(process.env.WSS_ADDRESS)

    const accountMnemonic = process.env.SECRET_PAYER_MNEMONIC
    const { account } = generateAccount(accountMnemonic)

    const didMnemonic = process.env.SECRET_AUTHENTICATION_MNEMONIC
    const { account: newAuthKeypair } = generateAccount(didMnemonic)
    const { authentication, assertionMethod } = generateKeypairs(didMnemonic)
    const attesterDidUri = Kilt.Did.getFullDidUriFromKey(authentication)

    console.log('assertionMethod.type :: ', assertionMethod.type)

    await updateFullDid(newAuthKeypair, attesterDidUri, account, async ({ data }) => ({
      signature: assertionMethod.sign(data),
      keyType: assertionMethod.type,
    }))
  } catch (e) {
    console.log('Error while checking on chain ctype')
    throw e
  }
})()
// }