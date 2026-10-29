import { expect, test } from "@playwright/test";

test("CustomSelect exposes accessible labels and localized empty/search text", async ({ page }) => {
	await page.goto("/engine-custom-select-a11y-test");

	const trigger = page.getByRole("combobox", { name: "Choose a fruit" });
	await expect(trigger).toBeVisible();
	await trigger.click();

	const listbox = page.getByRole("listbox", { name: "Choose a fruit" });
	await expect(listbox).toBeVisible();
	const search = page.getByRole("textbox", { name: "Choose a fruit search" });
	await expect(search).toHaveAttribute("placeholder", "Filter fruits");
	await search.fill("not-a-fruit");
	await expect(listbox.getByText("No fruit matches")).toBeVisible();
	await search.fill("banana");
	await expect(listbox.getByRole("option", { name: "Banana" })).toBeVisible();
	await expect(listbox.getByRole("option", { name: "Apple" })).toHaveCount(0);
});
