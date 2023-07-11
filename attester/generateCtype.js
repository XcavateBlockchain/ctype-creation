import { config as envConfig } from 'dotenv'

import * as Kilt from '@kiltprotocol/sdk-js'

import { generateAccount } from './generateAccount.js'
import { generateKeypairs } from './generateKeypairs.js'
import { getCtypeSchema } from './ctypeSchema.js'

export async function ensureStoredCtype(
  attesterAccount,
  attesterDid,
  signCallback
) {
  const api = Kilt.ConfigService.get('api')

  // Get the CTYPE and see if it's stored, if yes return it.
  const ctype = getCtypeSchema()
  try {
    await Kilt.CType.verifyStored(ctype)
    console.log('Ctype already stored. Skipping creation')
    return ctype
  } catch {
    console.log('Ctype not present. Creating it now...')
    // Authorize the tx.
    const encodedCtype = Kilt.CType.toChain(ctype)
    const tx = api.tx.ctype.add(encodedCtype)
    const extrinsic = await Kilt.Did.authorizeTx(
      attesterDid,
      tx,
      signCallback,
      attesterAccount.address
    )

    // Write to chain then return the CType.
    try {
      await Kilt.Blockchain.signAndSubmitTx(extrinsic, attesterAccount)

      return ctype
    } catch (error) {
      console.log('error :: ', error)
    }
  }
}

// Don't execute if this is imported by another file.
// if (require.main === module) {
  ;(async () => {
    envConfig()

    try {
      await Kilt.connect(process.env.WSS_ADDRESS)
      const api = Kilt.ConfigService.get('api')

      const accountMnemonic = process.env.SECRET_PAYER_MNEMONIC
      const { account } = generateAccount(accountMnemonic)
      const { authentication: payerAuthentication } = generateKeypairs(accountMnemonic)
      const payerAttesterDidUri = Kilt.Did.getFullDidUriFromKey(payerAuthentication)

      const didMnemonic = process.env.SECRET_AUTHENTICATION_MNEMONIC
      const { authentication, assertionMethod } = generateKeypairs(didMnemonic)
      const attesterDidUri = Kilt.Did.getFullDidUriFromKey(authentication)
      
      const encodedFullDid = await api.call.did.query(Kilt.Did.toChain(attesterDidUri))
      const {document} = Kilt.Did.linkedInfoFromChain(encodedFullDid)
      const keyId = document.assertionMethod?.[0].id

      console.log('keyUri :: ', `${document.uri}${keyId}`)

      await ensureStoredCtype(account, attesterDidUri, async ({ data }) => ({
        signature: assertionMethod.sign(data),
        keyType: assertionMethod.type,
        keyUri: `${document.uri}${keyId}`
      }))
    } catch (e) {
      console.log('Error while checking on chain ctype')
      throw e
    }
  })()
// }