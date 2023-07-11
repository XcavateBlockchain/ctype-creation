import * as Kilt from '@kiltprotocol/sdk-js'

// Return CType with the properties matching a given schema.
export function getCtypeSchema() {
  return Kilt.CType.fromProperties('Developer Credential', {
    fullName: { type: "string" },
    phoneNumber: { type: "string" },
    email: { type: "string" },
    profession: { type: "string" },
    address: { type: "string" },
    idDoc1: { type: "string" },
    idDoc2: { type: "string" }
  })
}