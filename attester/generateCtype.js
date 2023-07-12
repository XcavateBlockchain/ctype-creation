import { config as envConfig } from 'dotenv'

import * as Kilt from '@kiltprotocol/sdk-js'

import { generateAccount } from './generateAccount.js'
import { generateKeypairs } from './generateKeypairs.js'
import { getCtypeSchema } from './ctypeSchema.js'
import { updateAuthenticationKey } from './updateAuthenticationKey.js'

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

    // get $id of a new cType
    // const ctype = getCtypeSchema()
    // console.log('$id of cType :: ', Kilt.CType.getIdForSchema(ctype))

    try {
      await Kilt.connect(process.env.WSS_ADDRESS)
      const api = Kilt.ConfigService.get('api')

      const accountMnemonic = process.env.SECRET_PAYER_MNEMONIC
      const { account } = generateAccount(accountMnemonic)
      const { authentication, assertionMethod } = generateKeypairs(accountMnemonic)
      const attesterDidUri = Kilt.Did.getFullDidUriFromKey(authentication)

      try {
        // If the did is not fullDid, so it has no authentication key, run this line to update it
        // await updateAuthenticationKey(account, authentication, assertionMethod, attesterDidUri)
      
        const encodedFullDid = await api.call.did.query(Kilt.Did.toChain(attesterDidUri))
        const {document} = Kilt.Did.linkedInfoFromChain(encodedFullDid)
        const keyId = document.assertionMethod?.[0].id
  
        await ensureStoredCtype(account, attesterDidUri, async ({ data }) => ({
          signature: assertionMethod.sign(data),
          keyType: assertionMethod.type,
          keyUri: `${document.uri}${keyId}`
        }))
      } catch (error) {
        throw error
      }
    } catch (e) {
      console.log('Error while checking on chain ctype')
      throw e
    }
  })()
// }