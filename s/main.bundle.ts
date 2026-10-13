
import {register} from "@e280/sly"
import {Auth, makeAuthWidget} from "@e280/authlocal"

const auth = new Auth()

register({AuthWidget: makeAuthWidget(auth)})

await auth.remember()

