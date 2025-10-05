
import {css} from "lit"
export default css`

:host {
	display: flex;
	flex-direction: column;
	height: 100%;
	gap: 1em;
}

slot {
	display: block;
	height: 100%;
}

`

