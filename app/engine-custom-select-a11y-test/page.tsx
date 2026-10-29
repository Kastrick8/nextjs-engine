import { createPage } from "../../src/engine";

export default createPage({
	schema: {
		meta: { title: "CustomSelect accessibility regression test" },
		root: {
			type: "section",
			props: { p: "2rem", gap: "1rem" },
			children: [
				{
					type: "custom-select",
					props: {
						id: "fruit-select",
						name: "fruit",
						label: "Fruit",
						ariaLabel: "Choose a fruit",
						searchable: true,
						searchPlaceholder: "Filter fruits",
						emptyLabel: "No fruit matches",
						options: [
							{ value: "apple", label: "Apple" },
							{ value: "banana", label: "Banana" },
						],
					},
				},
			],
		},
	},
});
