
import {html} from "lit"
import {view} from "@e280/sly"

import styleCss from "./style.css.js"
import themeCss from "../../theme.css.js"
import {Context} from "../../context.js"

export const DashboardView = view(use => (context: Context) => {
	use.name("dashboard")
	use.css(themeCss, styleCss)

	const {auth} = context.authlocal
	const {AuthButton, AuthUser} = context.authlocal.views

	const pubkey = auth.login
		? context.pubkeys.derive(auth.login.nametag.id)
		: null

	return html`
		<div std-topper></div>

		<div std-slice>
			<slot></slot>
		</div>

		<div std-slice></div>

		<div std-bubble>
			<div>
				${AuthButton()}
				${AuthUser()}
				${pubkey}
			</div>
		</div>
	`
})

