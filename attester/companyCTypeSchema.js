import * as Kilt from '@kiltprotocol/sdk-js'

// Return CType with the properties matching a given schema.
export function getCompanyCtypeSchema() {
  return Kilt.CType.fromProperties('Company', {
    name: { type: "string" },
    registrationNumber: { type: "string" },
    email: { type: "string" },
    phoneNumber: { type: "string" },
    address: { type: "string" },
    associationWebsite: { type: "string" },
    associationMembershipNumber: { type: "string" },
    idDoc1: { type: "string" },
    idDoc2: { type: "string" }
  })
}