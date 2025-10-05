
import {css} from "lit"
import {cssReset} from "@e280/sly"
export default css`@layer reset, underlay, view, overlay;

${cssReset}

@layer underlay {
	a {
		color: var(--link);
		text-decoration: none;

		&:visited {
			color: color-mix(in srgb, var(--link), purple 30%);
		}

		&:is(:hover, :focus-visible) {
			color: color-mix(in srgb, var(--link), white 10%);
			text-decoration: underline;
		}

		&:active {
			color: color-mix(in srgb, var(--link), white 50%);
		}
	}

	button[theme="icon"] {
		background: transparent;
		border: none;
		color: inherit;

		cursor: pointer;
		opacity: 0.5;

		&:is(:hover, :focus-visible) {
			opacity: 1;
		}
	}

	[std-topper] {
		height: var(--burger-size);
	}

	[std-slice] {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

	[std-bubble] {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 0.5em;

		padding: 0.2em;
		border-radius: 1em;

		background: linear-gradient(
			to bottom right,
			color-mix(in oklab, var(--plate), white 50%),
			color-mix(in oklab, var(--plate), black 50%)
		);

		box-shadow: 0 0 5em color-mix(in oklab, transparent, var(--plate) 30%);

		> * {
			display: block;
			border-radius: inherit;
			height: 100%;
			overflow: hidden;

			background: color-mix(in oklab, black, var(--plate) 30%);
		}
	}
}

`

