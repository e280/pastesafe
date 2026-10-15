
import {addressMoniker} from "@e280/authlocal"

export function makeInviteLink(userId: string, proofToken: string) {
	const moniker = addressMoniker(userId)
	return `${location.origin}/#/invite/to/${moniker}/0/${proofToken}`
}

