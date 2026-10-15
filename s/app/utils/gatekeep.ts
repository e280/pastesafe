
import {html} from "lit"
import {Content} from "@e280/sly"
import {Auth, User} from "@e280/authlocal"

export function gatekeep<X>(options: {
		auth: Auth
		pleaseLogin?: () => Content
		loggedIn: (user: User) => X
	}) {

	const {
		auth: {user},
		loggedIn,
		pleaseLogin = () => html`<h2>please sign-in:</h2>`,
	} = options

	return user
		? loggedIn(user)
		: html`
			<div class=mantle>
				${pleaseLogin()}
				<auth-widget>sign-in</auth-widget>
			</div>
		`
}

