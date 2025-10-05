
import {html} from "lit"
import {view} from "@e280/sly"
import styleCss from "./style.css.js"
import themeCss from "../../theme.css.js"
import {Context} from "../../context.js"

export const DashboardView = view(use => (context: Context) => {
	use.name("dashboard")
	use.css(themeCss, styleCss)

	return html`
		<div std-topper></div>

		<div std-slice>
			<slot></slot>
		</div>

		<div std-slice></div>

		<div std-bubble>
			<div>
				${context.authlocal.views.AuthButton()}
				${context.authlocal.views.AuthUser()}
				hello world
			</div>
		</div>
	`
})

