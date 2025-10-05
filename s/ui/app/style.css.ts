
import {css} from "lit"
export default css`

:host {
	display: block;
}

[view="shiny-drawer"] {
	border-radius: 1em;
	--button-size: var(--burger-size);


	&::part(blanket) {
		background: var(--drawer);
		border-radius: 1em;
	}

	&::part(slate) {
		border-radius: 1em;
		overflow: hidden;
	}

	&::part(button) {
		color: var(--plate);
	}

	&:state(opened)::part(button) {
		color: var(--shiny-angry);
	}
}

main {
	height: 100%;
	padding: 0.5em;
}

`

